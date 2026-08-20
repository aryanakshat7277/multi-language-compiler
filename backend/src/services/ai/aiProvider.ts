export interface CodeReviewResult {
  issues: Array<{ line: number; message: string; severity: string }>;
  suggestions: string[];
  overallQuality: number;
}

export interface CodeExplanation {
  explanation: string;
  keyConcepts: string[];
}

export interface SimilarityResult {
  score: number;
  explanation: string;
}

export interface GeneratedTests {
  testCases: Array<{ input: string; expectedOutput: string }>;
  explanation: string;
}

export interface AiDetectionResult {
  probability: number;
  explanation: string;
}

export interface DebugResult {
  rootCause: string;
  hints: string[];
  fix: string;
}

export interface HoverExplanationResult {
  title: string;
  explanation: string;
  signature?: string;
  category?: string;
}

export interface GeneratedQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  starterCode: string;
  sampleInput: string;
  expectedOutput: string;
  points: number;
}

export interface GeneratedAssessment {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  topic: string;
  difficulty: string;
  questions: GeneratedQuestion[];
}

export interface AssessmentGradeResult {
  totalScore: number;
  maxScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'F';
  summary: string;
  strengths: string[];
  improvements: string[];
  questionResults: Array<{
    questionId: string;
    title: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
}

export interface CodeMetricsResult {
  detectedLanguage?: string;
  cyclomaticComplexity: number;
  cyclomaticRating: string;
  cyclomaticAnalysis: string;
  cyclomaticLocation: string;
  cyclomaticRec: string;

  maintainabilityIndex: number;
  maintainabilityRating: string;
  maintainabilityAnalysis: string;
  maintainabilityLocation: string;
  maintainabilityRec: string;

  codeDuplicationScore: number;
  codeDuplicationRating: string;
  codeDuplicationAnalysis: string;
  codeDuplicationLocation: string;
  codeDuplicationRec: string;

  codeSimilarityScore: number;
  codeSimilarityRating: string;
  codeSimilarityAnalysis: string;
  codeSimilarityLocation: string;
  codeSimilarityRec: string;

  halsteadEfficiency?: number;
  securityIndex?: number;
  vulnerabilitiesCount?: number;

  radarScores: {
    complexity: number;
    maintainability: number;
    duplication: number;
    similarity: number;
    modularity: number;
    density: number;
  };

  confidenceCurve: number[];
  maxQualityConfidence: number;

  issues: Array<{ type: string; message: string; line?: number }>;
  recommendations: string[];
}

export interface ShortestCodeResult {
  shortestCode: string;
  originalBytes: number;
  shortestBytes: number;
  reductionPercentage: number;
  techniquesUsed: string[];
  explanation: string;
}

export interface AIProvider {
  analyzeCode(code: string, language: string): Promise<CodeReviewResult>;
  reviewCode(code: string, language: string): Promise<CodeReviewResult>;
  explainCode(code: string, language: string, level: 'beginner' | 'intermediate' | 'advanced'): Promise<CodeExplanation>;
  compareCode(codeA: string, codeB: string, language: string): Promise<SimilarityResult>;
  generateTests(problem: string, code: string, language: string): Promise<GeneratedTests>;
  detectAiGenerated(code: string, language: string): Promise<AiDetectionResult>;
  debugCode(code: string, errorOutput: string, language: string): Promise<DebugResult>;
  generateAssessment(topic: string, difficulty: string, numQuestions?: number): Promise<GeneratedAssessment>;
  gradeAssessment(title: string, questions: any[], answers: Record<string, string>): Promise<AssessmentGradeResult>;
  analyzeCodeMetrics(code: string, language: string): Promise<CodeMetricsResult>;
  generateShortestCode(code: string, language: string, expectedOutput?: string): Promise<ShortestCodeResult>;
  generateAst(code: string, language: string): Promise<any>;
  explainHoverSymbol(word: string, lineContent: string, language: string): Promise<HoverExplanationResult>;
}
