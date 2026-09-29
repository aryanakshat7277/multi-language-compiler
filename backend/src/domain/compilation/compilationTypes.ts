/**
 * Unified Compilation Domain Models & Type System
 * Phase 1 — Production-Grade Foundation
 */

export type CompilationStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'RESOURCE_LIMIT';

export type StageType =
  | 'SOURCE'
  | 'LEXER'
  | 'PARSER'
  | 'AST'
  | 'SEMANTIC'
  | 'IR'
  | 'OPTIMIZATION'
  | 'CODE_GENERATION'
  | 'ASSEMBLY';

export type StageStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export interface SourceRange {
  file?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface StableArtifactId {
  tokenId?: string;
  astNodeId?: string;
  symbolId?: string;
  irInstructionId?: string;
  optimizationStepId?: string;
  assemblyInstructionId?: string;
}

export interface CompilationStage {
  stageId: string;
  stageType: StageType;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  inputReference?: string;
  outputReference?: string;
  metadata?: Record<string, any>;
}

export interface CompilationDiagnostic {
  diagnosticId: string;
  severity: 'info' | 'warning' | 'error' | 'fatal';
  message: string;
  stage: StageType;
  range?: SourceRange;
  code?: string;
  details?: string;
}

export interface CompilationStatistics {
  totalDurationMs: number;
  sourceSizeBytes: number;
  linesOfCode: number;
  peakMemoryMb: number;
  cpuTimeMs?: number;
  stageDurationsMs: Partial<Record<StageType, number>>;
}

export interface CompilationTrace {
  compilationId: string;
  sourceSnapshot: string;
  sourceHash: string;
  stages: CompilationStage[];
  diagnostics: CompilationDiagnostic[];
  statistics: CompilationStatistics;
  sourceMappings?: Array<{ artifactId: string; range: SourceRange }>;
}

export interface CompilationRequest {
  requestId: string;
  sourceCode: string;
  language: string;
  compilerVersion?: string;
  optimizationLevel?: 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Oz';
  target?: string;
  debugMode?: boolean;
  traceLevel?: 'none' | 'basic' | 'detailed' | 'verbose';
  stdin?: string;
  args?: string[];
  compileTimeoutMs?: number;
  runTimeoutMs?: number;
}

export interface CompilationResult {
  compilationId: string;
  requestId: string;
  status: CompilationStatus;
  sourceHash: string;
  language: string;
  compilerVersion: string;
  durationMs: number;
  stages: CompilationStage[];
  diagnostics: CompilationDiagnostic[];
  statistics: CompilationStatistics;
  output?: {
    stdout: string;
    stderr: string;
    exitCode: number;
    signal?: string | null;
  };
  artifacts?: {
    astSummary?: any;
    tokensSummary?: any;
    hasFullTrace: boolean;
  };
  traceMetadata: {
    applicationVersion: string;
    compilerVersion: string;
    target: string;
    optimizationLevel: string;
    createdAt: string;
  };
}
