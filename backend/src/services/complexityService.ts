/**
 * Complexity Analysis Service
 * 
 * Calculates cyclomatic complexity, nesting depth, function metrics,
 * code quality indicators, and maintainability scores.
 */

interface ComplexityResult {
  linesOfCode: number;
  linesOfCodeNoEmpty: number;
  commentLines: number;
  commentRatio: number;
  cyclomaticComplexity: number;
  functionsCount: number;
  maxNestingDepth: number;
  avgFunctionLength: number;
  longFunctions: Array<{ name: string; lines: number; line: number }>;
  excessiveNesting: Array<{ line: number; depth: number }>;
  duplicateBlocks: Array<{ lines: number[]; content: string }>;
  unusedVariables: string[];
  codeQualityScore: number;
  complexityRating: 'low' | 'moderate' | 'high' | 'very_high';
  maintainabilityIndex: number;
  issues: Array<{ severity: 'critical' | 'warning' | 'info'; message: string; line?: number }>;
  recommendations: string[];
}

export class ComplexityService {
  /**
   * Perform comprehensive complexity analysis on source code.
   */
  static async analyze(sourceCode: string, languageId: string): Promise<ComplexityResult> {
    const lines = sourceCode.split('\n');
    const loc = lines.length;
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const locNoEmpty = nonEmptyLines.length;

    // Count comments
    const commentLines = this.countComments(lines, languageId);
    const commentRatio = loc > 0 ? commentLines / loc : 0;

    // Cyclomatic complexity
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(sourceCode, languageId);

    // Function analysis
    const functions = this.extractFunctions(sourceCode, lines, languageId);
    const functionsCount = functions.length;
    const avgFunctionLength = functionsCount > 0
      ? functions.reduce((sum, f) => sum + f.length, 0) / functionsCount
      : 0;
    const longFunctions = functions
      .filter(f => f.length > 50)
      .map(f => ({ name: f.name, lines: f.length, line: f.startLine }));

    // Nesting depth
    const maxNestingDepth = this.calculateMaxNestingDepth(sourceCode, languageId);
    const excessiveNesting = this.findExcessiveNesting(lines, languageId, 4);

    // Duplicate detection
    const duplicateBlocks = this.findDuplicateBlocks(lines);

    // Unused variables
    const unusedVariables = this.findUnusedVariables(sourceCode, languageId);

    // Calculate scores
    const complexityRating = this.rateComplexity(cyclomaticComplexity);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(loc, cyclomaticComplexity, commentRatio);
    const codeQualityScore = this.calculateQualityScore(
      cyclomaticComplexity, maxNestingDepth, commentRatio,
      longFunctions.length, duplicateBlocks.length, unusedVariables.length,
      avgFunctionLength
    );

    // Generate issues and recommendations
    const issues = this.generateIssues(
      cyclomaticComplexity, maxNestingDepth, longFunctions,
      excessiveNesting, duplicateBlocks, unusedVariables, commentRatio
    );
    const recommendations = this.generateRecommendations(
      cyclomaticComplexity, maxNestingDepth, commentRatio,
      longFunctions.length, duplicateBlocks.length, functionsCount, loc
    );

    return {
      linesOfCode: loc,
      linesOfCodeNoEmpty: locNoEmpty,
      commentLines,
      commentRatio: Math.round(commentRatio * 100) / 100,
      cyclomaticComplexity,
      functionsCount,
      maxNestingDepth,
      avgFunctionLength: Math.round(avgFunctionLength),
      longFunctions,
      excessiveNesting,
      duplicateBlocks,
      unusedVariables,
      codeQualityScore,
      complexityRating,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      issues,
      recommendations
    };
  }

  /**
   * Calculate cyclomatic complexity by counting decision points.
   */
  private static calculateCyclomaticComplexity(code: string, languageId: string): number {
    let complexity = 1; // Base complexity

    // Decision keywords
    const decisionPatterns = [
      /\bif\b/g, /\belse\s+if\b/g, /\belif\b/g,
      /\bfor\b/g, /\bwhile\b/g, /\bcase\b/g,
      /\bcatch\b/g, /\bexcept\b/g
    ];

    for (const pattern of decisionPatterns) {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    }

    // Logical operators
    const logicalOps = (code.match(/&&|\|\|/g) || []).length;
    complexity += logicalOps;

    // Ternary operators
    const ternary = (code.match(/\?[^?:]*:/g) || []).length;
    complexity += ternary;

    // Python-specific: list comprehensions with conditions
    if (languageId === 'python') {
      const comprehensionIf = (code.match(/\bif\b(?=.*\bfor\b.*\bin\b)/g) || []).length;
      complexity += comprehensionIf;
    }

    return complexity;
  }

  /**
   * Calculate maximum nesting depth of control structures.
   */
  private static calculateMaxNestingDepth(code: string, languageId: string): number {
    if (languageId === 'python') {
      return this.calculatePythonNestingDepth(code);
    }

    let maxDepth = 0;
    let currentDepth = 0;

    for (const ch of code) {
      if (ch === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (ch === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * Calculate nesting depth for Python (indentation-based).
   */
  private static calculatePythonNestingDepth(code: string): number {
    const lines = code.split('\n');
    let maxDepth = 0;

    for (const line of lines) {
      if (line.trim().length === 0) continue;
      const indent = line.search(/\S/);
      const depth = Math.floor(indent / 4); // Assuming 4-space indent
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Count comment lines in source code.
   */
  private static countComments(lines: string[], languageId: string): number {
    let count = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (inBlockComment) {
        count++;
        if (trimmed.includes('*/')) inBlockComment = false;
        continue;
      }

      if (trimmed.startsWith('/*')) {
        count++;
        if (!trimmed.includes('*/')) inBlockComment = true;
      } else if (trimmed.startsWith('//') || (languageId === 'python' && trimmed.startsWith('#'))) {
        count++;
      }
    }

    return count;
  }

  /**
   * Extract function information from source code.
   */
  private static extractFunctions(code: string, lines: string[], languageId: string): Array<{ name: string; startLine: number; length: number }> {
    const functions: Array<{ name: string; startLine: number; length: number }> = [];

    if (languageId === 'python') {
      const funcRegex = /^def\s+(\w+)/gm;
      let match;
      while ((match = funcRegex.exec(code)) !== null) {
        const startLine = code.substring(0, match.index).split('\n').length;
        const baseIndent = lines[startLine - 1].search(/\S/);
        let endLine = startLine;
        for (let i = startLine; i < lines.length; i++) {
          const l = lines[i];
          if (l.trim() === '') continue;
          if (l.search(/\S/) <= baseIndent && i > startLine - 1) break;
          endLine = i + 1;
        }
        functions.push({ name: match[1], startLine, length: endLine - startLine + 1 });
      }
    } else {
      // C-family function detection
      const funcRegex = /(?:(?:public|private|protected|static|async|void|int|float|double|string|boolean|char|auto|var|let|const|function)\s+)*(\w+)\s*\([^)]*\)\s*\{/g;
      let match;
      while ((match = funcRegex.exec(code)) !== null) {
        const startLine = code.substring(0, match.index).split('\n').length;
        const braceStart = code.indexOf('{', match.index);
        let depth = 0;
        let endPos = braceStart;
        for (let i = braceStart; i < code.length; i++) {
          if (code[i] === '{') depth++;
          if (code[i] === '}') { depth--; if (depth === 0) { endPos = i; break; } }
        }
        const endLine = code.substring(0, endPos).split('\n').length;
        functions.push({ name: match[1], startLine, length: endLine - startLine + 1 });
      }
    }

    return functions;
  }

  /**
   * Find lines with excessive nesting depth.
   */
  private static findExcessiveNesting(lines: string[], languageId: string, threshold: number): Array<{ line: number; depth: number }> {
    const results: Array<{ line: number; depth: number }> = [];

    if (languageId === 'python') {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length === 0) continue;
        const indent = lines[i].search(/\S/);
        const depth = Math.floor(indent / 4);
        if (depth > threshold) {
          results.push({ line: i + 1, depth });
        }
      }
    } else {
      let depth = 0;
      for (let i = 0; i < lines.length; i++) {
        for (const ch of lines[i]) {
          if (ch === '{') depth++;
          if (ch === '}') depth = Math.max(0, depth - 1);
        }
        if (depth > threshold && lines[i].trim().length > 0) {
          results.push({ line: i + 1, depth });
        }
      }
    }

    return results.slice(0, 20); // Limit results
  }

  /**
   * Find duplicate code blocks (hash-based comparison of consecutive lines).
   */
  private static findDuplicateBlocks(lines: string[], minBlockSize: number = 3): Array<{ lines: number[]; content: string }> {
    const blocks = new Map<string, number>();
    const duplicates: Array<{ lines: number[]; content: string }> = [];

    for (let i = 0; i <= lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).map(l => l.trim()).join('\n');
      if (block.replace(/\s/g, '').length < 10) continue; // Skip trivial blocks

      const existing = blocks.get(block);
      if (existing !== undefined) {
        duplicates.push({
          lines: [existing + 1, i + 1],
          content: block.substring(0, 100)
        });
      } else {
        blocks.set(block, i);
      }
    }

    return duplicates.slice(0, 10);
  }

  /**
   * Find potentially unused variables (declared but never referenced again).
   */
  private static findUnusedVariables(code: string, languageId: string): string[] {
    const declarations = new Map<string, number>();
    const declRegex = languageId === 'python'
      ? /^(\w+)\s*=\s/gm
      : /\b(?:const|let|var|int|float|double|char|bool|string|auto)\s+(\w+)\s*[=;]/g;

    let match;
    while ((match = declRegex.exec(code)) !== null) {
      const varName = match[1] || match[2];
      if (varName && varName.length > 1) {
        declarations.set(varName, (declarations.get(varName) || 0));
      }
    }

    const unused: string[] = [];
    for (const [varName] of declarations) {
      // Count total occurrences of the variable name as a whole word
      const occurrences = (code.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
      // If it only appears once (the declaration), it's unused
      if (occurrences <= 1) {
        unused.push(varName);
      }
    }

    return unused.slice(0, 20);
  }

  /**
   * Rate complexity level.
   */
  private static rateComplexity(cc: number): 'low' | 'moderate' | 'high' | 'very_high' {
    if (cc <= 10) return 'low';
    if (cc <= 20) return 'moderate';
    if (cc <= 50) return 'high';
    return 'very_high';
  }

  /**
   * Calculate Maintainability Index (simplified version of the Visual Studio formula).
   */
  private static calculateMaintainabilityIndex(loc: number, cc: number, commentRatio: number): number {
    if (loc === 0) return 100;
    const logLoc = Math.log(loc);
    const logCc = Math.log(cc);
    // Simplified MI formula: 171 - 5.2*ln(HV) - 0.23*CC - 16.2*ln(LOC) + 50*sin(sqrt(2.4*CM))
    // Using simplified version
    const mi = 171 - 5.2 * logLoc - 0.23 * cc - 16.2 * logLoc + 50 * Math.sin(Math.sqrt(2.4 * commentRatio));
    return Math.max(0, Math.min(100, mi));
  }

  /**
   * Calculate overall code quality score (0-100).
   */
  private static calculateQualityScore(
    cc: number, maxNesting: number, commentRatio: number,
    longFuncCount: number, duplicateCount: number, unusedVarCount: number,
    avgFuncLength: number
  ): number {
    let score = 100;

    // Penalize high complexity
    if (cc > 10) score -= Math.min(20, (cc - 10) * 2);
    if (cc > 20) score -= Math.min(10, (cc - 20));

    // Penalize deep nesting
    if (maxNesting > 3) score -= Math.min(15, (maxNesting - 3) * 5);

    // Penalize no comments
    if (commentRatio < 0.05) score -= 10;
    if (commentRatio < 0.01) score -= 5;

    // Penalize long functions
    score -= Math.min(15, longFuncCount * 5);

    // Penalize duplicates
    score -= Math.min(15, duplicateCount * 5);

    // Penalize unused variables
    score -= Math.min(10, unusedVarCount * 2);

    // Penalize long average function length
    if (avgFuncLength > 30) score -= Math.min(10, Math.floor((avgFuncLength - 30) / 5));

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate issue list from analysis.
   */
  private static generateIssues(
    cc: number, maxNesting: number,
    longFunctions: Array<{ name: string; lines: number; line: number }>,
    excessiveNesting: Array<{ line: number; depth: number }>,
    duplicates: Array<{ lines: number[]; content: string }>,
    unusedVars: string[], commentRatio: number
  ): Array<{ severity: 'critical' | 'warning' | 'info'; message: string; line?: number }> {
    const issues: Array<{ severity: 'critical' | 'warning' | 'info'; message: string; line?: number }> = [];

    if (cc > 20) issues.push({ severity: 'critical', message: `High cyclomatic complexity (${cc}). Consider breaking down into smaller functions.` });
    else if (cc > 10) issues.push({ severity: 'warning', message: `Moderate cyclomatic complexity (${cc}). Consider simplifying control flow.` });

    if (maxNesting > 5) issues.push({ severity: 'critical', message: `Excessive nesting depth (${maxNesting}). Refactor with early returns or guard clauses.` });
    else if (maxNesting > 3) issues.push({ severity: 'warning', message: `Deep nesting (${maxNesting} levels). Consider flattening.` });

    for (const f of longFunctions) {
      issues.push({ severity: 'warning', message: `Function '${f.name}' is ${f.lines} lines long. Consider splitting.`, line: f.line });
    }

    for (const n of excessiveNesting.slice(0, 5)) {
      issues.push({ severity: 'warning', message: `Excessive nesting (${n.depth} levels) detected.`, line: n.line });
    }

    for (const d of duplicates) {
      issues.push({ severity: 'info', message: `Duplicate code block found at lines ${d.lines.join(', ')}. Consider extracting a function.` });
    }

    for (const v of unusedVars.slice(0, 5)) {
      issues.push({ severity: 'info', message: `Variable '${v}' appears to be unused.` });
    }

    if (commentRatio < 0.05) issues.push({ severity: 'info', message: `Low comment ratio (${Math.round(commentRatio * 100)}%). Consider adding documentation.` });

    return issues;
  }

  /**
   * Generate recommendations based on analysis.
   */
  private static generateRecommendations(
    cc: number, maxNesting: number, commentRatio: number,
    longFuncCount: number, duplicateCount: number, funcCount: number, loc: number
  ): string[] {
    const recs: string[] = [];

    if (cc > 10) recs.push('Reduce cyclomatic complexity by extracting helper functions and using early returns.');
    if (maxNesting > 3) recs.push('Reduce nesting depth by using guard clauses, early returns, or extracting nested logic.');
    if (commentRatio < 0.1) recs.push('Add comments to explain complex logic, function purposes, and algorithmic decisions.');
    if (longFuncCount > 0) recs.push('Break long functions into smaller, focused functions following the Single Responsibility Principle.');
    if (duplicateCount > 0) recs.push('Extract duplicate code blocks into reusable functions to improve maintainability.');
    if (funcCount === 0 && loc > 20) recs.push('Consider organizing code into functions for better readability and testability.');
    if (loc > 200) recs.push('Consider splitting this file into multiple modules for better organization.');

    if (recs.length === 0) recs.push('Code quality looks good! Keep up the clean coding practices.');

    return recs;
  }
}
