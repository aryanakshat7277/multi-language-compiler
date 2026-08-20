// Piston API v2 types
export interface PistonFile {
  name?: string;
  content: string;
  encoding?: string;
}

export interface PistonExecuteRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

export interface PistonOutput {
  stdout: string;
  stderr: string;
  code: number;
  signal: string | null;
  output: string;
}

export interface PistonExecuteResponse {
  language: string;
  version: string;
  run: PistonOutput;
  compile?: PistonOutput;
}

export interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
  runtime?: string;
}

export interface PistonHealthStatus {
  status: 'UP' | 'DOWN' | 'TIMEOUT' | 'CONFIGURATION_ERROR';
  baseUrlConfigured: boolean;
  reachable: boolean;
  error?: string;
}

// Application-level types
export type CompilerStatus = 
  | 'IDLE'
  | 'SUBMITTED'
  | 'COMPILING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'LANGUAGE_UNAVAILABLE'
  | 'COMPILER_SERVICE_UNAVAILABLE'
  | 'COMPILER_SERVICE_TIMEOUT'
  | 'EXECUTION_ERROR'
  | 'CANCELLED';

export interface CompilerExecutionRequest {
  language: string;
  version?: string;
  files: { name: string; content: string }[];
  stdin?: string;
  args?: string[];
  compileTimeout?: number;
  runTimeout?: number;
}

export interface CompilerExecutionResponse {
  executionId: string;
  status: CompilerStatus;
  language: string;
  version: string;
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
  };
  run?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
  };
  executionTimeMs?: number;
  createdAt: string;
}

export interface LanguageDefinition {
  id: string;
  pistonLanguage: string;
  pistonVersion: string;
  displayName: string;
  fileExtension: string;
  defaultFilename: string;
  supportsCompilation: boolean;
  supportsStdin: boolean;
  defaultCompileTimeout: number;
  defaultRunTimeout: number;
  enabled: boolean;
}
