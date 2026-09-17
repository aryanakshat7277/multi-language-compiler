import { randomUUID } from 'crypto';
import { 
  CompilationRequest, 
  CompilationStage, 
  CompilationDiagnostic, 
  CompilationStatistics, 
  CompilationTrace, 
  StageType, 
  SourceRange 
} from '../../domain/compilation/compilationTypes';

export class CompilationContext {
  public readonly compilationId: string;
  public readonly requestId: string;
  public readonly request: CompilationRequest;
  public readonly createdAt: number = Date.now();
  public readonly abortController: AbortController = new AbortController();

  private nodeCounter = 0;
  private activeStages: Map<string, { stageType: StageType; startedAt: number; stage: CompilationStage }> = new Map();
  private completedStages: CompilationStage[] = [];
  private diagnostics: CompilationDiagnostic[] = [];
  private sourceMappings: Array<{ artifactId: string; range: SourceRange }> = [];
  private cancelled = false;
  private cancelReason?: string;

  constructor(request: CompilationRequest, compilationId?: string) {
    this.compilationId = compilationId || `c-${randomUUID()}`;
    this.requestId = request.requestId || `req-${randomUUID().substring(0, 8)}`;
    this.request = request;
  }

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public isCancelled(): boolean {
    return this.cancelled || this.abortController.signal.aborted;
  }

  public cancel(reason: string = 'Compilation cancelled by user'): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.cancelReason = reason;
    this.abortController.abort();
  }

  public getCancelReason(): string | undefined {
    return this.cancelReason;
  }

  /**
   * Generates a stable, unique artifact identifier scoped exclusively to this compilation context.
   * Eliminates all global mutable state and counter race conditions.
   */
  public generateArtifactId(prefix: 'tok' | 'ast' | 'sym' | 'ir' | 'opt' | 'asm'): string {
    const compactId = this.compilationId.replace(/^c-/, '').substring(0, 8);
    return `${prefix}-${compactId}-${++this.nodeCounter}`;
  }

  public startStage(stageType: StageType, inputReference?: string): string {
    const stageId = `stg-${stageType.toLowerCase()}-${++this.nodeCounter}`;
    const now = Date.now();
    const stage: CompilationStage = {
      stageId,
      stageType,
      status: 'RUNNING',
      startedAt: new Date(now).toISOString(),
      inputReference,
    };

    this.activeStages.set(stageId, { stageType, startedAt: now, stage });
    return stageId;
  }

  public completeStage(stageId: string, outputReference?: string, metadata?: Record<string, any>): void {
    const entry = this.activeStages.get(stageId);
    if (!entry) return;

    const durationMs = Date.now() - entry.startedAt;
    entry.stage.status = 'COMPLETED';
    entry.stage.completedAt = new Date().toISOString();
    entry.stage.durationMs = durationMs;
    entry.stage.outputReference = outputReference;
    entry.stage.metadata = metadata;

    this.activeStages.delete(stageId);
    this.completedStages.push(entry.stage);
  }

  public failStage(stageId: string, errorMessage: string, metadata?: Record<string, any>): void {
    const entry = this.activeStages.get(stageId);
    if (!entry) return;

    const durationMs = Date.now() - entry.startedAt;
    entry.stage.status = 'FAILED';
    entry.stage.completedAt = new Date().toISOString();
    entry.stage.durationMs = durationMs;
    entry.stage.metadata = { ...metadata, error: errorMessage };

    this.activeStages.delete(stageId);
    this.completedStages.push(entry.stage);
  }

  public addDiagnostic(diag: Omit<CompilationDiagnostic, 'diagnosticId'>): void {
    this.diagnostics.push({
      ...diag,
      diagnosticId: `diag-${this.compilationId.substring(2, 8)}-${this.diagnostics.length + 1}`
    });
  }

  public addSourceMapping(artifactId: string, range: SourceRange): void {
    this.sourceMappings.push({ artifactId, range });
  }

  public getStages(): CompilationStage[] {
    return [...this.completedStages];
  }

  public getDiagnostics(): CompilationDiagnostic[] {
    return [...this.diagnostics];
  }

  public getStatistics(totalDurationMs: number, sourceBytes: number, linesOfCode: number): CompilationStatistics {
    const stageDurationsMs: Partial<Record<StageType, number>> = {};
    for (const stage of this.completedStages) {
      if (typeof stage.durationMs === 'number') {
        stageDurationsMs[stage.stageType] = (stageDurationsMs[stage.stageType] || 0) + stage.durationMs;
      }
    }

    const mem = process.memoryUsage();
    return {
      totalDurationMs,
      sourceSizeBytes: sourceBytes,
      linesOfCode,
      peakMemoryMb: Math.round(mem.rss / (1024 * 1024)),
      stageDurationsMs
    };
  }

  public toTrace(sourceSnapshot: string, sourceHash: string, totalDurationMs: number): CompilationTrace {
    const linesOfCode = sourceSnapshot.split('\n').length;
    const statistics = this.getStatistics(totalDurationMs, Buffer.byteLength(sourceSnapshot, 'utf8'), linesOfCode);

    return {
      compilationId: this.compilationId,
      sourceSnapshot,
      sourceHash,
      stages: this.getStages(),
      diagnostics: this.getDiagnostics(),
      statistics,
      sourceMappings: this.sourceMappings.length > 0 ? this.sourceMappings : undefined
    };
  }
}
