import { SourceRange, StageType } from './compilationTypes';

export type CompilationErrorCode =
  | 'INVALID_REQUEST'
  | 'SOURCE_TOO_LARGE'
  | 'SYNTAX_ERROR'
  | 'SEMANTIC_ERROR'
  | 'COMPILATION_TIMEOUT'
  | 'RESOURCE_LIMIT'
  | 'QUEUE_FULL'
  | 'INTERNAL_COMPILER_ERROR'
  | 'SERVICE_UNAVAILABLE';

export class CompilationError extends Error {
  public readonly errorCode: CompilationErrorCode;
  public readonly compilationId: string;
  public readonly stage: StageType;
  public readonly sourceRange?: SourceRange;
  public readonly severity: 'error' | 'fatal';
  public readonly details?: any;

  constructor(params: {
    errorCode: CompilationErrorCode;
    message: string;
    compilationId: string;
    stage: StageType;
    sourceRange?: SourceRange;
    severity?: 'error' | 'fatal';
    details?: any;
  }) {
    super(params.message);
    this.name = 'CompilationError';
    this.errorCode = params.errorCode;
    this.compilationId = params.compilationId;
    this.stage = params.stage;
    this.sourceRange = params.sourceRange;
    this.severity = params.severity || 'error';
    this.details = params.details;

    Object.setPrototypeOf(this, CompilationError.prototype);
  }

  /**
   * Produce a safe, client-facing JSON object with zero server-path leakage
   */
  public toClientResponse() {
    return {
      errorCode: this.errorCode,
      message: this.sanitizeMessage(this.message),
      stage: this.stage,
      compilationId: this.compilationId,
      sourceRange: this.sourceRange,
      severity: this.severity,
      details: this.sanitizeDetails(this.details)
    };
  }

  private sanitizeMessage(msg: string): string {
    // Strip Windows/Linux absolute paths and stack traces
    return msg
      .replace(/[A-Za-z]:\\[^ \n\r\t:]+/g, '[internal-path]')
      .replace(/\/app\/[^ \n\r\t:]+/g, '[internal-path]')
      .replace(/\/home\/[^ \n\r\t:]+/g, '[internal-path]');
  }

  private sanitizeDetails(details: any): any {
    if (!details) return undefined;
    if (typeof details === 'string') return this.sanitizeMessage(details);
    if (typeof details === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(details)) {
        if (['stack', 'env', 'secret', 'password', 'token'].includes(k.toLowerCase())) continue;
        sanitized[k] = typeof v === 'string' ? this.sanitizeMessage(v) : v;
      }
      return sanitized;
    }
    return details;
  }
}
