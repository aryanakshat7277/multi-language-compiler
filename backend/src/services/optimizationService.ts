/**
 * Optimization Analysis Service
 * 
 * Analyzes source code for optimization opportunities using pattern matching
 * and heuristic analysis. Identifies constant folding, dead code, loop
 * optimizations, and other common improvement opportunities.
 */

interface OptimizationOpportunity {
  type: string;
  category: 'performance' | 'memory' | 'readability' | 'redundancy';
  severity: 'high' | 'medium' | 'low';
  line?: number;
  message: string;
  currentCode?: string;
  suggestedCode?: string;
}

interface OptimizationResult {
  opportunities: OptimizationOpportunity[];
  totalOpportunities: number;
  performanceScore: number;
  summary: string;
}

export class OptimizationService {
  /**
   * Analyze source code for optimization opportunities.
   */
  static async analyze(sourceCode: string, languageId: string): Promise<OptimizationResult> {
    const lines = sourceCode.split('\n');
    const opportunities: OptimizationOpportunity[] = [];

    // Run all optimization checks
    opportunities.push(...this.detectConstantFolding(lines));
    opportunities.push(...this.detectDeadCode(lines, languageId));
    opportunities.push(...this.detectLoopInvariantCode(lines));
    opportunities.push(...this.detectCommonSubexpressions(lines));
    opportunities.push(...this.detectRedundantComputation(lines));
    opportunities.push(...this.detectUnnecessaryNestedLoops(lines));
    opportunities.push(...this.detectInefficiencies(sourceCode, lines, languageId));
    opportunities.push(...this.detectMemoryIssues(lines, languageId));

    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(opportunities);

    // Generate summary
    const summary = this.generateSummary(opportunities);

    return {
      opportunities,
      totalOpportunities: opportunities.length,
      performanceScore,
      summary
    };
  }

  /**
   * Detect constant folding opportunities — expressions with only literal operands
   * that could be pre-computed at compile time, especially inside loops.
   */
  private static detectConstantFolding(lines: string[]): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];

    // Find constant expressions inside loops
    let insideLoop = false;
    let loopDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (/\b(for|while)\b/.test(trimmed)) {
        insideLoop = true;
        loopDepth++;
      }
      if (trimmed.includes('{')) loopDepth++;
      if (trimmed.includes('}')) {
        loopDepth--;
        if (loopDepth <= 0) { insideLoop = false; loopDepth = 0; }
      }

      if (insideLoop) {
        // Detect constant arithmetic: number op number
        const constExprMatch = trimmed.match(/(\w+)\s*=\s*(\d+(?:\.\d+)?)\s*[+\-*/]\s*(\d+(?:\.\d+)?)\s*;/);
        if (constExprMatch) {
          const expr = `${constExprMatch[2]} ${trimmed.match(/[+\-*/]/)?.[0] || '?'} ${constExprMatch[3]}`;
          try {
            const result = eval(expr);
            results.push({
              type: 'constant_folding',
              category: 'performance',
              severity: 'medium',
              line: i + 1,
              message: `Constant expression '${expr}' inside loop can be pre-computed.`,
              currentCode: trimmed,
              suggestedCode: `${constExprMatch[1]} = ${result}; // Computed outside loop`
            });
          } catch { /* ignore eval errors */ }
        }

        // Detect string concatenation with only literals in loops
        const strConcatMatch = trimmed.match(/["'][\w\s]+["']\s*\+\s*["'][\w\s]+["']/);
        if (strConcatMatch) {
          results.push({
            type: 'constant_folding',
            category: 'performance',
            severity: 'low',
            line: i + 1,
            message: 'String literal concatenation inside loop can be pre-computed.',
            currentCode: strConcatMatch[0],
            suggestedCode: '// Concatenate string literals before the loop'
          });
        }
      }
    }

    return results;
  }

  /**
   * Detect dead code — code after return, break, or continue statements.
   */
  private static detectDeadCode(lines: string[], languageId: string): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];
    const terminators = ['return', 'break', 'continue', 'throw', 'exit', 'sys.exit'];

    for (let i = 0; i < lines.length - 1; i++) {
      const trimmed = lines[i].trim();

      for (const term of terminators) {
        if (trimmed.startsWith(term + ' ') || trimmed.startsWith(term + ';') || trimmed === term || trimmed === term + ';') {
          // Check if the next non-empty, non-comment line is at the same or deeper indentation
          let nextIdx = i + 1;
          while (nextIdx < lines.length && lines[nextIdx].trim().length === 0) nextIdx++;

          if (nextIdx < lines.length) {
            const nextTrimmed = lines[nextIdx].trim();
            // Skip closing braces, else, catch, finally
            if (nextTrimmed === '}' || nextTrimmed.startsWith('else') || nextTrimmed.startsWith('catch') || nextTrimmed.startsWith('finally') || nextTrimmed.startsWith('except')) continue;

            // In Python, check indentation
            if (languageId === 'python') {
              const currentIndent = lines[i].search(/\S/);
              const nextIndent = lines[nextIdx].search(/\S/);
              if (nextIndent > currentIndent) {
                results.push({
                  type: 'dead_code',
                  category: 'redundancy',
                  severity: 'high',
                  line: nextIdx + 1,
                  message: `Unreachable code after '${term}' statement.`,
                  currentCode: lines[nextIdx].trim(),
                  suggestedCode: '// Remove unreachable code'
                });
              }
            } else {
              // For braces languages, basic check
              if (!nextTrimmed.startsWith('}') && !nextTrimmed.startsWith('case') && !nextTrimmed.startsWith('default')) {
                // Check we're still in the same block (simplified)
                const currentIndent = lines[i].search(/\S/);
                const nextIndent = lines[nextIdx].search(/\S/);
                if (nextIndent >= currentIndent) {
                  results.push({
                    type: 'dead_code',
                    category: 'redundancy',
                    severity: 'high',
                    line: nextIdx + 1,
                    message: `Possible unreachable code after '${term}' statement.`,
                    currentCode: lines[nextIdx].trim(),
                    suggestedCode: '// Remove unreachable code'
                  });
                }
              }
            }
          }
          break;
        }
      }
    }

    return results;
  }

  /**
   * Detect loop-invariant code — computations inside loops that don't depend on loop variables.
   */
  private static detectLoopInvariantCode(lines: string[]): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Detect for loop
      const forMatch = trimmed.match(/for\s*\(\s*(?:\w+\s+)?(\w+)\s*=/);
      if (!forMatch) continue;

      const loopVar = forMatch[1];
      let braceStart = lines[i].indexOf('{');
      if (braceStart < 0 && i + 1 < lines.length) braceStart = 0; // next line

      // Scan loop body for assignments that don't reference the loop variable
      let depth = 0;
      let started = false;
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('{')) { depth++; started = true; }
        if (lines[j].includes('}')) { depth--; if (started && depth === 0) break; }

        if (j > i && started) {
          const bodyLine = lines[j].trim();
          // Check for assignments that don't use loop variable or array indexing
          const assignMatch = bodyLine.match(/(\w+)\s*=\s*(.+);/);
          if (assignMatch) {
            const rhs = assignMatch[2];
            if (!rhs.includes(loopVar) && !rhs.includes('[') && !rhs.includes('(') &&
                /^\d+\s*[+\-*/]\s*\d+$/.test(rhs.trim())) {
              results.push({
                type: 'loop_invariant',
                category: 'performance',
                severity: 'medium',
                line: j + 1,
                message: `Expression '${rhs.trim()}' does not depend on loop variable '${loopVar}'. Move it outside the loop.`,
                currentCode: bodyLine,
                suggestedCode: `// Move before loop: ${bodyLine}`
              });
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Detect common subexpressions — identical expressions computed multiple times.
   */
  private static detectCommonSubexpressions(lines: string[]): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];
    const expressions = new Map<string, number[]>();

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Extract expressions on the right side of assignments
      const assignMatch = trimmed.match(/=\s*(.+?)\s*;/);
      if (assignMatch) {
        const expr = assignMatch[1].trim();
        // Only consider non-trivial expressions (contain operators and aren't just variables)
        if (expr.match(/\w+\s*[+\-*/]\s*\w+/) && expr.length > 5) {
          const existing = expressions.get(expr);
          if (existing) {
            existing.push(i + 1);
          } else {
            expressions.set(expr, [i + 1]);
          }
        }
      }
    }

    for (const [expr, lineNums] of expressions) {
      if (lineNums.length >= 2) {
        results.push({
          type: 'common_subexpression',
          category: 'performance',
          severity: 'low',
          line: lineNums[1],
          message: `Expression '${expr.substring(0, 40)}' appears ${lineNums.length} times (lines ${lineNums.join(', ')}). Consider storing in a variable.`,
          currentCode: expr,
          suggestedCode: `const computed = ${expr}; // Reuse this variable`
        });
      }
    }

    return results;
  }

  /**
   * Detect redundant computation patterns.
   */
  private static detectRedundantComputation(lines: string[]): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Detect array.length in loop condition
      if (/for\s*\(.+;\s*\w+\s*<\s*\w+\.(length|size|count)\(\?\)\s*;/.test(trimmed)) {
        results.push({
          type: 'redundant_computation',
          category: 'performance',
          severity: 'low',
          line: i + 1,
          message: 'Consider caching array length/size before the loop if the collection is not modified.',
          currentCode: trimmed,
          suggestedCode: '// Cache: const len = array.length; for(... i < len; ...)'
        });
      }

      // Detect multiplication by 1, addition of 0
      if (/\*\s*1(?:\s|;|$)/.test(trimmed) && !/\/\*/.test(trimmed)) {
        results.push({
          type: 'redundant_computation',
          category: 'redundancy',
          severity: 'low',
          line: i + 1,
          message: 'Multiplication by 1 is redundant.',
          currentCode: trimmed
        });
      }
      if (/\+\s*0(?:\s|;|$)/.test(trimmed)) {
        results.push({
          type: 'redundant_computation',
          category: 'redundancy',
          severity: 'low',
          line: i + 1,
          message: 'Addition of 0 is redundant.',
          currentCode: trimmed
        });
      }
    }

    return results;
  }

  /**
   * Detect potentially O(n²) unnecessary nested loops.
   */
  private static detectUnnecessaryNestedLoops(lines: string[]): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];
    let loopDepth = 0;
    let loopStack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/\b(for|while)\b/.test(trimmed)) {
        loopDepth++;
        loopStack.push(i + 1);

        if (loopDepth >= 2) {
          results.push({
            type: 'nested_loop',
            category: 'performance',
            severity: loopDepth >= 3 ? 'high' : 'medium',
            line: i + 1,
            message: `Nested loop detected (depth ${loopDepth}). This may result in O(n${'²³⁴'[Math.min(loopDepth - 1, 3)] || '^' + loopDepth}) time complexity. Consider using hash maps or sorting to reduce complexity.`,
            currentCode: trimmed
          });
        }
      }

      // Track brace depth for loop exit
      for (const ch of trimmed) {
        if (ch === '{') { /* tracked with loop detection */ }
        if (ch === '}') {
          if (loopDepth > 0) {
            loopDepth--;
            loopStack.pop();
          }
        }
      }
    }

    return results;
  }

  /**
   * Detect language-specific inefficiencies.
   */
  private static detectInefficiencies(code: string, lines: string[], languageId: string): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];

    // String concatenation in loops (use StringBuilder/join instead)
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/\+=\s*["']/.test(trimmed) || /\+=\s*\w/.test(trimmed)) {
        // Check if inside a loop
        let inLoop = false;
        for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
          if (/\b(for|while)\b/.test(lines[j])) { inLoop = true; break; }
        }
        if (inLoop && /\+=/.test(trimmed) && !/\+=\s*\d/.test(trimmed)) {
          results.push({
            type: 'string_concat_loop',
            category: 'performance',
            severity: 'medium',
            line: i + 1,
            message: 'String concatenation inside loop. Consider using StringBuilder (Java), list join (Python), or array push + join (JS).',
            currentCode: trimmed
          });
        }
      }
    }

    // Repeated function calls that could be cached
    if (languageId === 'python') {
      // Detect range(len(...)) pattern
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('range(len(')) {
          results.push({
            type: 'python_antipattern',
            category: 'readability',
            severity: 'low',
            line: i + 1,
            message: "Consider using 'enumerate()' instead of 'range(len(...))'.",
            currentCode: lines[i].trim(),
            suggestedCode: '# Use: for i, item in enumerate(collection):'
          });
        }
      }
    }

    return results;
  }

  /**
   * Detect potential memory issues.
   */
  private static detectMemoryIssues(lines: string[], languageId: string): OptimizationOpportunity[] {
    const results: OptimizationOpportunity[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Large array initialization
      const largeSizeMatch = trimmed.match(/new\s+\w+\[(\d+)\]/);
      if (largeSizeMatch) {
        const size = parseInt(largeSizeMatch[1]);
        if (size > 1000000) {
          results.push({
            type: 'large_allocation',
            category: 'memory',
            severity: 'high',
            line: i + 1,
            message: `Large array allocation (${size.toLocaleString()} elements). Consider streaming or chunked processing.`,
            currentCode: trimmed
          });
        }
      }
    }

    return results;
  }

  /**
   * Calculate performance score based on found opportunities.
   */
  private static calculatePerformanceScore(opportunities: OptimizationOpportunity[]): number {
    let score = 100;

    for (const opp of opportunities) {
      switch (opp.severity) {
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate human-readable summary.
   */
  private static generateSummary(opportunities: OptimizationOpportunity[]): string {
    if (opportunities.length === 0) {
      return 'No significant optimization opportunities detected. The code appears well-optimized.';
    }

    const highCount = opportunities.filter(o => o.severity === 'high').length;
    const medCount = opportunities.filter(o => o.severity === 'medium').length;
    const lowCount = opportunities.filter(o => o.severity === 'low').length;

    const parts: string[] = [];
    if (highCount > 0) parts.push(`${highCount} high-priority`);
    if (medCount > 0) parts.push(`${medCount} medium-priority`);
    if (lowCount > 0) parts.push(`${lowCount} low-priority`);

    return `Found ${opportunities.length} optimization opportunities: ${parts.join(', ')}. Review suggestions for potential improvements. Note: These are heuristic recommendations, not guaranteed bugs.`;
  }
}
