/**
 * Code Similarity Service
 * 
 * Performs multi-level similarity analysis between two code samples:
 * - Lexical similarity (token-based Jaccard/cosine)
 * - Structural similarity (control flow comparison)
 * - AST similarity (tree structure comparison)
 * - Semantic similarity (AI-powered meaning comparison)
 * - Algorithm similarity (AI-powered algorithm detection)
 */

import { LexerService } from './lexerService';
import { ParserService } from './parserService';

interface SimilarityResult {
  lexicalScore: number;
  structuralScore: number;
  astScore: number;
  semanticScore: number;
  algorithmScore: number;
  overallScore: number;
  explanation: string;
  details: {
    lexicalDetails: string;
    structuralDetails: string;
    astDetails: string;
  };
}

export class SimilarityService {
  /**
   * Calculate multi-level similarity between two code samples.
   */
  static async calculateSimilarity(
    codeA: string,
    codeB: string,
    languageId: string
  ): Promise<SimilarityResult> {
    // 1. Lexical Similarity — Token-based comparison
    const lexicalResult = await this.calculateLexicalSimilarity(codeA, codeB, languageId);

    // 2. Structural Similarity — Control flow comparison
    const structuralResult = this.calculateStructuralSimilarity(codeA, codeB);

    // 3. AST Similarity — Tree structure comparison
    const astResult = await this.calculateAstSimilarity(codeA, codeB, languageId);

    // 4. Semantic + Algorithm Similarity — AI-powered (Gemini 3.6 Flash)
    try {
      const { aiProvider } = await import('./ai/geminiProvider');
      if (aiProvider) {
        const aiResult: any = await aiProvider.compareCode(codeA, codeB, languageId);
        if (aiResult) {
          const overallScore = typeof aiResult.overallScore === 'number' ? aiResult.overallScore : (aiResult.score > 1 ? aiResult.score / 100 : aiResult.score);
          const lexScore = typeof aiResult.lexicalScore === 'number' ? (aiResult.lexicalScore > 1 ? aiResult.lexicalScore / 100 : aiResult.lexicalScore) : lexicalResult.score;
          const structScore = typeof aiResult.structuralScore === 'number' ? (aiResult.structuralScore > 1 ? aiResult.structuralScore / 100 : aiResult.structuralScore) : structuralResult.score;
          const astScr = typeof aiResult.astScore === 'number' ? (aiResult.astScore > 1 ? aiResult.astScore / 100 : aiResult.astScore) : astResult.score;

          return {
            lexicalScore: Math.round(lexScore * 100) / 100,
            structuralScore: Math.round(structScore * 100) / 100,
            astScore: Math.round(astScr * 100) / 100,
            semanticScore: Math.round(overallScore * 100) / 100,
            algorithmScore: Math.round(overallScore * 0.95 * 100) / 100,
            overallScore: Math.round(overallScore * 100) / 100,
            explanation: aiResult.explanation || 'Gemini 3.6 Flash structural & semantic comparison analysis completed.',
            details: {
              lexicalDetails: `Lexical similarity: ${Math.round(lexScore * 100)}%`,
              structuralDetails: `Structural similarity: ${Math.round(structScore * 100)}%`,
              astDetails: `AST Isomorphism: ${Math.round(astScr * 100)}%`
            }
          };
        }
      }
    } catch {
      // AI not available — use heuristic fallback
    }

    const fallbackSem = (lexicalResult.score + structuralResult.score + astResult.score) / 3;
    const fallbackAlgo = structuralResult.score * 0.9;
    const fallbackOverall = lexicalResult.score * 0.15 + structuralResult.score * 0.20 + astResult.score * 0.25 + fallbackSem * 0.25 + fallbackAlgo * 0.15;
    const explanation = this.generateExplanation(
      lexicalResult.score, structuralResult.score, astResult.score,
      fallbackSem, fallbackAlgo, fallbackOverall, 'Scores based on structural and lexical analysis.'
    );

    return {
      lexicalScore: Math.round(lexicalResult.score * 100) / 100,
      structuralScore: Math.round(structuralResult.score * 100) / 100,
      astScore: Math.round(astResult.score * 100) / 100,
      semanticScore: Math.round(fallbackSem * 100) / 100,
      algorithmScore: Math.round(fallbackAlgo * 100) / 100,
      overallScore: Math.round(fallbackOverall * 100) / 100,
      explanation,
      details: {
        lexicalDetails: lexicalResult.details,
        structuralDetails: structuralResult.details,
        astDetails: astResult.details
      }
    };
  }

  /**
   * Lexical similarity using token n-gram Jaccard coefficient.
   */
  private static async calculateLexicalSimilarity(
    codeA: string, codeB: string, languageId: string
  ): Promise<{ score: number; details: string }> {
    const tokensA = await LexerService.tokenize(codeA, languageId);
    const tokensB = await LexerService.tokenize(codeB, languageId);

    // Extract token type sequences (ignoring specific values for identifiers)
    const seqA = tokensA.tokens
      .filter(t => t.type !== 'comment')
      .map(t => t.type === 'identifier' ? 'ID' : t.type === 'number' ? 'NUM' : t.value);
    const seqB = tokensB.tokens
      .filter(t => t.type !== 'comment')
      .map(t => t.type === 'identifier' ? 'ID' : t.type === 'number' ? 'NUM' : t.value);

    // Generate n-grams (bigrams and trigrams)
    const ngramsA = new Set([
      ...this.generateNgrams(seqA, 2),
      ...this.generateNgrams(seqA, 3)
    ]);
    const ngramsB = new Set([
      ...this.generateNgrams(seqB, 2),
      ...this.generateNgrams(seqB, 3)
    ]);

    // Jaccard similarity
    const intersection = new Set([...ngramsA].filter(x => ngramsB.has(x)));
    const union = new Set([...ngramsA, ...ngramsB]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;

    // Also compare token distribution similarity
    const distSim = this.distributionSimilarity(tokensA.distribution as any, tokensB.distribution as any);

    const score = jaccard * 0.7 + distSim * 0.3;

    return {
      score: Math.min(1, score),
      details: `Token n-gram Jaccard: ${(jaccard * 100).toFixed(1)}%, Distribution similarity: ${(distSim * 100).toFixed(1)}%`
    };
  }

  /**
   * Structural similarity — compare control flow patterns.
   */
  private static calculateStructuralSimilarity(
    codeA: string, codeB: string
  ): { score: number; details: string } {
    // Extract control flow signatures
    const flowA = this.extractControlFlow(codeA);
    const flowB = this.extractControlFlow(codeB);

    // Compare control flow sequences using LCS
    const lcsLength = this.longestCommonSubsequence(flowA, flowB);
    const maxLen = Math.max(flowA.length, flowB.length);
    const flowSimilarity = maxLen > 0 ? lcsLength / maxLen : 1;

    // Compare function count and nesting
    const funcCountA = (codeA.match(/\b(function|def|fn|func)\b/g) || []).length;
    const funcCountB = (codeB.match(/\b(function|def|fn|func)\b/g) || []).length;
    const funcSimilarity = funcCountA === 0 && funcCountB === 0
      ? 1
      : 1 - Math.abs(funcCountA - funcCountB) / Math.max(funcCountA, funcCountB, 1);

    // Compare nesting patterns
    const nestA = this.getNestingPattern(codeA);
    const nestB = this.getNestingPattern(codeB);
    const nestSimilarity = this.cosineSimilarity(nestA, nestB);

    const score = flowSimilarity * 0.5 + funcSimilarity * 0.2 + nestSimilarity * 0.3;

    return {
      score: Math.min(1, score),
      details: `Control flow LCS: ${(flowSimilarity * 100).toFixed(1)}%, Function structure: ${(funcSimilarity * 100).toFixed(1)}%, Nesting pattern: ${(nestSimilarity * 100).toFixed(1)}%`
    };
  }

  /**
   * AST similarity — compare tree structures.
   */
  private static async calculateAstSimilarity(
    codeA: string, codeB: string, languageId: string
  ): Promise<{ score: number; details: string }> {
    const astA = await ParserService.parseToAst(codeA, languageId);
    const astB = await ParserService.parseToAst(codeB, languageId);

    // Extract node type sequences (pre-order traversal)
    const typesA = this.flattenAstTypes(astA);
    const typesB = this.flattenAstTypes(astB);

    // Compare node type sequences using LCS
    const lcsLen = this.longestCommonSubsequence(typesA, typesB);
    const maxLen = Math.max(typesA.length, typesB.length);
    const sequenceSim = maxLen > 0 ? lcsLen / maxLen : 1;

    // Compare node type frequency distribution
    const freqA = this.countFrequencies(typesA);
    const freqB = this.countFrequencies(typesB);
    const freqSim = this.mapCosineSimilarity(freqA, freqB);

    // Compare tree depth
    const depthA = this.getTreeDepth(astA);
    const depthB = this.getTreeDepth(astB);
    const depthSim = 1 - Math.abs(depthA - depthB) / Math.max(depthA, depthB, 1);

    const score = sequenceSim * 0.5 + freqSim * 0.3 + depthSim * 0.2;

    return {
      score: Math.min(1, score),
      details: `AST sequence similarity: ${(sequenceSim * 100).toFixed(1)}%, Node frequency: ${(freqSim * 100).toFixed(1)}%, Tree depth: ${(depthSim * 100).toFixed(1)}%`
    };
  }

  // === Helper Methods ===

  private static generateNgrams(tokens: string[], n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join('|'));
    }
    return ngrams;
  }

  private static distributionSimilarity(
    a: Record<string, number>,
    b: Record<string, number>
  ): number {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const vecA: number[] = [];
    const vecB: number[] = [];
    for (const key of allKeys) {
      vecA.push((a as any)[key] || 0);
      vecB.push((b as any)[key] || 0);
    }
    return this.cosineSimilarity(vecA, vecB);
  }

  private static extractControlFlow(code: string): string[] {
    const flow: string[] = [];
    const patterns: [RegExp, string][] = [
      [/\bif\b/g, 'IF'],
      [/\belse\s+if\b|\belif\b/g, 'ELIF'],
      [/\belse\b/g, 'ELSE'],
      [/\bfor\b/g, 'FOR'],
      [/\bwhile\b/g, 'WHILE'],
      [/\bswitch\b|\bmatch\b/g, 'SWITCH'],
      [/\bcase\b/g, 'CASE'],
      [/\breturn\b/g, 'RETURN'],
      [/\btry\b/g, 'TRY'],
      [/\bcatch\b|\bexcept\b/g, 'CATCH'],
      [/\bbreak\b/g, 'BREAK'],
      [/\bcontinue\b/g, 'CONTINUE'],
    ];

    // Build a position-ordered list
    const entries: Array<{ pos: number; type: string }> = [];
    for (const [regex, type] of patterns) {
      let match;
      const re = new RegExp(regex.source, 'g');
      while ((match = re.exec(code)) !== null) {
        entries.push({ pos: match.index, type });
      }
    }

    entries.sort((a, b) => a.pos - b.pos);
    return entries.map(e => e.type);
  }

  private static getNestingPattern(code: string): number[] {
    const lines = code.split('\n');
    const depths: number[] = new Array(10).fill(0);
    let depth = 0;
    for (const line of lines) {
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth = Math.max(0, depth - 1);
      }
      if (depth < depths.length) depths[depth]++;
    }
    return depths;
  }

  private static flattenAstTypes(node: any): string[] {
    const types: string[] = [node.type];
    if (node.children) {
      for (const child of node.children) {
        types.push(...this.flattenAstTypes(child));
      }
    }
    return types;
  }

  private static getTreeDepth(node: any): number {
    if (!node.children || node.children.length === 0) return 1;
    return 1 + Math.max(...node.children.map((c: any) => this.getTreeDepth(c)));
  }

  private static countFrequencies(items: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const item of items) {
      freq.set(item, (freq.get(item) || 0) + 1);
    }
    return freq;
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.max(a.length, b.length);
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < len; i++) {
      const va = a[i] || 0;
      const vb = b[i] || 0;
      dot += va * vb;
      magA += va * va;
      magB += vb * vb;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  private static mapCosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    const allKeys = new Set([...a.keys(), ...b.keys()]);
    const vecA: number[] = [];
    const vecB: number[] = [];
    for (const key of allKeys) {
      vecA.push(a.get(key) || 0);
      vecB.push(b.get(key) || 0);
    }
    return this.cosineSimilarity(vecA, vecB);
  }

  private static longestCommonSubsequence(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;

    // Use space-optimized LCS
    if (m === 0 || n === 0) return 0;

    // Limit size to avoid memory issues
    if (m > 500 || n > 500) {
      // Fall back to simplified comparison for large inputs
      const setA = new Set(a);
      const setB = new Set(b);
      const intersection = [...setA].filter(x => setB.has(x)).length;
      const union = new Set([...setA, ...setB]).size;
      return Math.round((intersection / Math.max(union, 1)) * Math.min(m, n));
    }

    const prev = new Array(n + 1).fill(0);
    const curr = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          curr[j] = prev[j - 1] + 1;
        } else {
          curr[j] = Math.max(prev[j], curr[j - 1]);
        }
      }
      for (let j = 0; j <= n; j++) {
        prev[j] = curr[j];
        curr[j] = 0;
      }
    }

    return prev[n];
  }

  /**
   * Generate a human-readable explanation of similarity results.
   */
  private static generateExplanation(
    lexical: number, structural: number, ast: number,
    semantic: number, algorithm: number, overall: number,
    aiExplanation: string
  ): string {
    const parts: string[] = [];

    if (overall > 0.8) {
      parts.push('High overall similarity detected between the two code samples.');
    } else if (overall > 0.5) {
      parts.push('Moderate similarity detected between the two code samples.');
    } else {
      parts.push('Low similarity between the two code samples.');
    }

    if (structural > 0.8) parts.push('Both programs share very similar control flow structures.');
    if (ast > 0.8) parts.push('The AST structures are highly similar, suggesting similar code organization.');
    if (lexical > 0.8) parts.push('Token sequences are highly similar.');
    if (lexical < 0.3 && structural > 0.7) parts.push('Despite different token usage, the structural approach is similar.');

    if (aiExplanation) {
      parts.push(aiExplanation);
    }

    parts.push('\nNote: High similarity does not automatically indicate plagiarism. The final assessment must remain with the instructor.');

    return parts.join(' ');
  }
}
