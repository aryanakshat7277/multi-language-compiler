const RAW_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL.slice(0, -1) : RAW_BASE_URL;

async function fetchWrapper<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (normalizedPath.startsWith('/api/')) normalizedPath = normalizedPath.substring(4);

  const fullUrl = `${BASE_URL}${normalizedPath}`;
  const response = await fetch(fullUrl, { ...options, headers });

  if (!response.ok) {
    let message = 'API Error';
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch { message = response.statusText; }
    throw new Error(message);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

export const api = {
  get: <T = any>(endpoint: string) => fetchWrapper<T>(endpoint),
  post: <T = any>(endpoint: string, body?: any) =>
    fetchWrapper<T>(endpoint, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) =>
    fetchWrapper<T>(endpoint, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => fetchWrapper<T>(endpoint, { method: 'DELETE' }),
};

// ─── AST ────────────────────────────────────────────────────────────────────
export interface AstNode {
  id: string;
  name: string;
  type: string;
  line?: number;
  children?: AstNode[];
}

export async function getAst(code: string, language: string): Promise<{ success: boolean; ast: AstNode; language: string }> {
  return api.post('/ast/parse', { code, language });
}

// ─── Code Analysis ───────────────────────────────────────────────────────────
export interface CodeAnalysisResult {
  id?: string;
  tokenData: {
    totalTokens: number;
    keywords: number;
    operators: number;
    identifiers: number;
    literals?: number;
    punctuation?: number;
  };
  aiMetrics?: {
    detectedLanguage?: string;
    cyclomaticComplexity: number;
    cyclomaticRating: string;
    cyclomaticAnalysis?: string;
    cyclomaticLocation?: string;
    cyclomaticRec?: string;

    maintainabilityIndex: number;
    maintainabilityRating: string;
    maintainabilityAnalysis?: string;
    maintainabilityLocation?: string;
    maintainabilityRec?: string;

    codeDuplicationScore?: number;
    codeDuplicationRating?: string;
    codeDuplicationAnalysis?: string;
    codeDuplicationLocation?: string;
    codeDuplicationRec?: string;

    codeSimilarityScore?: number;
    codeSimilarityRating?: string;
    codeSimilarityAnalysis?: string;
    codeSimilarityLocation?: string;
    codeSimilarityRec?: string;

    halsteadEfficiency?: number;
    securityIndex?: number;
    vulnerabilitiesCount?: number;

    radarScores: {
      complexity: number;
      maintainability: number;
      duplication?: number;
      similarity?: number;
      security?: number;
      halstead?: number;
      modularity: number;
      density: number;
    };

    confidenceCurve: number[];
    maxQualityConfidence: number;

    issues: Array<{ type: string; message: string; line?: number }>;
    recommendations: string[];
  };
  complexityData: {
    cyclomaticComplexity: number;
    cognitiveComplexity?: number;
    maintainabilityIndex: number;
    codeQualityScore: number;
    issues: Array<{ type: string; message: string; line?: number; severity?: string }>;
    recommendations: string[];
  };
  qualityData?: {
    score: number;
    issues: Array<{ type: string; message: string }>;
    recommendations: string[];
  };
  performanceData?: {
    suggestions: string[];
    bottlenecks: string[];
  };
}

export async function getCodeMetrics(sourceCode: string, languageId: string): Promise<CodeAnalysisResult> {
  return api.post('/code-analysis', { sourceCode, languageId });
}

// ─── Code Similarity ─────────────────────────────────────────────────────────
export interface SimilarityResult {
  lexicalScore: number;
  structuralScore: number;
  astScore: number;
  semanticScore: number;
  algorithmScore: number;
  overallScore: number;
  explanation: string;
  details?: any;
}

export async function getCodeSimilarity(
  sourceCodeA: string,
  sourceCodeB: string,
  languageId: string
): Promise<SimilarityResult> {
  return api.post('/code-similarity', { sourceCodeA, sourceCodeB, languageId });
}

// ─── AI Explain ──────────────────────────────────────────────────────────────
export interface ExplanationResult {
  explanation: string;
  keyConcepts: string[];
}

export async function getAiExplanation(
  sourceCode: string,
  languageId: string,
  level = 'intermediate'
): Promise<ExplanationResult> {
  return api.post('/ai/explain', { sourceCode, languageId, level });
}

export interface HoverResult {
  title: string;
  explanation: string;
  signature?: string;
  category?: string;
}

export async function getHoverExplanation(
  word: string,
  lineContent: string,
  languageId: string
): Promise<HoverResult> {
  return api.post('/ai-review/hover', { word, lineContent, languageId });
}

// ─── AI Generate Tests ───────────────────────────────────────────────────────
export interface TestsResult {
  testCases: Array<{ input: string; expectedOutput: string }>;
  explanation: string;
}

export async function getAiTests(
  sourceCode: string,
  languageId: string,
  problemDescription = ''
): Promise<TestsResult> {
  return api.post('/ai/generate-tests', { problemDescription, sourceCode, languageId });
}

// ─── AI Debug ────────────────────────────────────────────────────────────────
export interface DebugResult {
  rootCause: string;
  hints: string[];
  fix: string;
}

export async function getAiDebug(
  sourceCode: string,
  errorOutput: string,
  languageId: string
): Promise<DebugResult> {
  return api.post('/ai-review/debug', { sourceCode, languageId, errorOutput });
}

// ─── AI Code Review ──────────────────────────────────────────────────────────
export interface ReviewResult {
  issues: Array<{ line: number; message: string; severity: string }>;
  suggestions: string[];
  overallQuality: number;
}

export async function getAiReview(sourceCode: string, languageId: string): Promise<ReviewResult> {
  return api.post('/ai/review', { sourceCode, languageId });
}

// ─── AI Detect ───────────────────────────────────────────────────────────────
export interface DetectResult {
  probability: number;
  explanation: string;
}

export async function getAiDetect(sourceCode: string, languageId: string): Promise<DetectResult> {
  return api.post('/ai/detect', { sourceCode, languageId });
}

// ─── AI Shortest Code ────────────────────────────────────────────────────────
export interface ShortestCodeResult {
  shortestCode: string;
  originalBytes: number;
  shortestBytes: number;
  reductionPercentage: number;
  techniquesUsed: string[];
  explanation: string;
}

export async function getShortestCode(
  sourceCode: string,
  languageId: string,
  expectedOutput?: string
): Promise<ShortestCodeResult> {
  return api.post('/ai/shortest-code', { sourceCode, languageId, expectedOutput });
}

// ─── User / Auth ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export async function getCurrentUser(): Promise<UserProfile> {
  return api.get('/auth/me');
}

export async function getUserSubmissions(userId: string): Promise<any[]> {
  return api.get(`/users/${userId}/submissions`);
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  totalProblems: number;
  totalSubmissions: number;
  successRate: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  return api.get('/admin/stats');
}

// ─── Problems ────────────────────────────────────────────────────────────────
export async function getProblems(): Promise<any[]> {
  return api.get('/problems');
}

// ─── Assessments ────────────────────────────────────────────────────────────
export interface AssessmentGradeReport {
  totalScore: number;
  maxScore: number;
  grade: string;
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

export async function generateAiAssessment(topic: string, difficulty: string, numQuestions = 3): Promise<any> {
  return api.post('/assessments/generate-ai', { topic, difficulty, numQuestions });
}

export async function submitAssessmentReport(assessmentId: string, title: string, questions: any[], answers: Record<string, string>): Promise<AssessmentGradeReport> {
  return api.post(`/assessments/${assessmentId}/submit`, { title, questions, answers });
}
