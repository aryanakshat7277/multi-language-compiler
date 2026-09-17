import { 
  CompilationRequest, 
  CompilationResult, 
  CompilationStatus, 
  CompilationTrace 
} from '../../domain/compilation/compilationTypes';
import { CompilationError } from '../../domain/compilation/compilationErrors';
import { COMPILATION_LIMITS, APPLICATION_VERSION } from '../../config/compilationConfig';
import { CompilationContext } from './compilationContext';
import { CompilationCache } from './compilationCache';
import { CompilationMetrics } from './compilationMetrics';
import { parseCode } from '../astService';
import { LocalExecutorService } from '../localExecutorService';
import { languageRegistry } from '../piston/languageRegistry';
import { logger } from '../../utils/logger';

interface QueuedJob {
  compilationId: string;
  resolve: () => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class CompilationOrchestrator {
  private static activeJobs = 0;
  private static waitQueue: QueuedJob[] = [];
  private static activeContexts: Map<string, CompilationContext> = new Map();
  private static traces: Map<string, { trace: CompilationTrace; fullAst?: any; output?: any; createdAt: number }> = new Map();

  // In-memory trace store max depth (prevents unbounded memory)
  private static readonly MAX_STORED_TRACES = 2000;

  /**
   * Acquire a bounded concurrency slot in the compilation pool
   */
  private static async acquireSlot(compilationId: string, timeoutMs: number = 30000): Promise<void> {
    if (this.activeJobs < COMPILATION_LIMITS.maxConcurrentCompilations) {
      this.activeJobs++;
      CompilationMetrics.setActiveCompilations(this.activeJobs);
      return;
    }

    if (this.waitQueue.length >= COMPILATION_LIMITS.maxQueueDepth) {
      throw new CompilationError({
        errorCode: 'QUEUE_FULL',
        message: `Compiler worker queue capacity reached (${COMPILATION_LIMITS.maxQueueDepth} jobs). System under heavy load, please retry shortly.`,
        compilationId,
        stage: 'SOURCE',
        severity: 'fatal'
      });
    }

    CompilationMetrics.setQueueDepth(this.waitQueue.length + 1);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = CompilationOrchestrator.waitQueue.findIndex(q => q.timer === timer);
        if (idx !== -1) {
          CompilationOrchestrator.waitQueue.splice(idx, 1);
          CompilationMetrics.setQueueDepth(CompilationOrchestrator.waitQueue.length);
          reject(new CompilationError({
            errorCode: 'COMPILATION_TIMEOUT',
            message: `Queue wait timeout exceeded (${timeoutMs}ms limit). Server busy.`,
            compilationId,
            stage: 'SOURCE',
            severity: 'fatal'
          }));
        }
      }, timeoutMs);

      CompilationOrchestrator.waitQueue.push({ compilationId, resolve, reject, timer });
    });
  }

  /**
   * Release a concurrency slot and dispatch the next queued job
   */
  private static releaseSlot(): void {
    this.activeJobs = Math.max(0, this.activeJobs - 1);
    const next = this.waitQueue.shift();
    CompilationMetrics.setQueueDepth(this.waitQueue.length);

    if (next) {
      clearTimeout(next.timer);
      this.activeJobs++;
      CompilationMetrics.setActiveCompilations(this.activeJobs);
      next.resolve();
    } else {
      CompilationMetrics.setActiveCompilations(this.activeJobs);
    }
  }

  /**
   * Cancel an in-flight compilation job by ID
   */
  public static cancelCompilation(compilationId: string, reason: string = 'User requested cancellation'): boolean {
    // 1. Check active contexts
    const ctx = this.activeContexts.get(compilationId);
    if (ctx) {
      ctx.cancel(reason);
      CompilationMetrics.recordCancellation();
      logger.info(`[Compilation] Cancelled active job ${compilationId}: ${reason}`);
      return true;
    }

    // 2. Check wait queue
    const qIdx = this.waitQueue.findIndex(q => q.compilationId === compilationId);
    if (qIdx !== -1) {
      const queued = this.waitQueue.splice(qIdx, 1)[0];
      clearTimeout(queued.timer);
      CompilationMetrics.setQueueDepth(this.waitQueue.length);
      CompilationMetrics.recordCancellation();
      queued.reject(new CompilationError({
        errorCode: 'INVALID_REQUEST',
        message: 'Compilation cancelled while in queue',
        compilationId,
        stage: 'SOURCE'
      }));
      logger.info(`[Compilation] Cancelled queued job ${compilationId}`);
      return true;
    }

    return false;
  }

  /**
   * Main compilation execution pipeline
   */
  public static async execute(request: CompilationRequest): Promise<CompilationResult> {
    const startTime = Date.now();
    CompilationMetrics.recordRequest();

    // 1. Validate request
    if (!request.sourceCode || typeof request.sourceCode !== 'string') {
      throw new CompilationError({
        errorCode: 'INVALID_REQUEST',
        message: 'Source code is required and must be a non-empty string.',
        compilationId: 'c-invalid',
        stage: 'SOURCE'
      });
    }

    if (!request.language || typeof request.language !== 'string') {
      throw new CompilationError({
        errorCode: 'INVALID_REQUEST',
        message: 'Programming language must be specified.',
        compilationId: 'c-invalid',
        stage: 'SOURCE'
      });
    }

    const sourceBytes = Buffer.byteLength(request.sourceCode, 'utf8');
    if (sourceBytes > COMPILATION_LIMITS.maxSourceSizeBytes) {
      throw new CompilationError({
        errorCode: 'SOURCE_TOO_LARGE',
        message: `Source code size (${sourceBytes} bytes) exceeds maximum limit (${COMPILATION_LIMITS.maxSourceSizeBytes} bytes).`,
        compilationId: 'c-oversized',
        stage: 'SOURCE',
        severity: 'fatal'
      });
    }

    // 2. Check Idempotency & Deterministic Cache
    const sourceHash = CompilationCache.generateSourceHash(request);
    const cachedResult = CompilationCache.get(sourceHash);
    if (cachedResult) {
      logger.info(`[Compilation] Cache HIT for hash ${sourceHash.substring(0, 10)}`);
      return {
        ...cachedResult,
        requestId: request.requestId,
        compilationId: `c-cached-${Date.now()}`
      };
    }

    // 3. Initialize Thread-Safe Context
    const ctx = new CompilationContext(request);
    this.activeContexts.set(ctx.compilationId, ctx);

    let finalStatus: CompilationStatus = 'RUNNING';
    let outputResult: { stdout: string; stderr: string; exitCode: number; signal?: string | null } | undefined;
    let fullAstData: any = undefined;

    try {
      // 4. Acquire Bounded Concurrency Slot
      await this.acquireSlot(ctx.compilationId, COMPILATION_LIMITS.defaultCompileTimeoutMs * 2);

      // Check cancellation immediately after dequeuing
      if (ctx.isCancelled()) {
        throw new CompilationError({
          errorCode: 'INVALID_REQUEST',
          message: ctx.getCancelReason() || 'Compilation cancelled',
          compilationId: ctx.compilationId,
          stage: 'SOURCE'
        });
      }

      // STAGE 1: SOURCE (Analysis & Security Validation)
      const stgSourceId = ctx.startStage('SOURCE');
      const lines = request.sourceCode.split('\n');

      // Security check for dangerous fork-bombs and disk wipers
      const maliciousPatterns = [
        /(?:while\s+True|for\s*\(\s*;\s*;\s*\)|while\s*\(\s*1\s*\))\s*:\s*.*(?:os\.fork|fork\(\))/i,
        /:(){ :|:& };:/,
        /rm\s+-rf\s+\/(?:\s|$)/,
        /mkfs\./
      ];

      for (const pattern of maliciousPatterns) {
        if (pattern.test(request.sourceCode)) {
          ctx.addDiagnostic({
            severity: 'fatal',
            message: 'Security Restriction: Destructive system call or fork-bomb pattern blocked by static sandbox guard.',
            stage: 'SOURCE',
            range: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 20 },
            code: 'SEC_ERR_01'
          });
          ctx.failStage(stgSourceId, 'Security pattern blocked');
          finalStatus = 'RESOURCE_LIMIT';
          outputResult = {
            stdout: '',
            stderr: 'Execution Error: Security sandbox blocked unsafe system instruction.',
            exitCode: 1,
            signal: 'SIGKILL'
          };
          break;
        }
      }

      if (finalStatus !== 'RESOURCE_LIMIT') {
        ctx.completeStage(stgSourceId, undefined, { linesOfCode: lines.length, sourceBytes });
        CompilationMetrics.recordStageDuration('SOURCE', ctx.getStages().find(s => s.stageId === stgSourceId)?.durationMs || 0);

        // STAGE 2: PARSER / AST EXPLORATION
        const stgParserId = ctx.startStage('PARSER');
        try {
          fullAstData = await parseCode(request.sourceCode, request.language);
          const astSummary = {
            rootType: fullAstData?.type || fullAstData?.name || 'Program',
            nodeCount: fullAstData?.children?.length || 1,
            hasErrors: fullAstData?.type === 'ParseError' || fullAstData?.type === 'SyntaxError'
          };
          ctx.completeStage(stgParserId, 'ast-tree-v1', astSummary);
          CompilationMetrics.recordStageDuration('PARSER', ctx.getStages().find(s => s.stageId === stgParserId)?.durationMs || 0);
        } catch (astErr: any) {
          ctx.failStage(stgParserId, `AST generation notice: ${astErr.message}`);
        }

        // STAGE 3: COMPILER & EXECUTION
        const stgExecId = ctx.startStage('CODE_GENERATION');
        const langDef = await languageRegistry.getLanguageByAppId(request.language);
        const resolvedLanguage = langDef ? langDef.pistonLanguage : request.language;

        const execPromise = LocalExecutorService.execute({
          language: resolvedLanguage,
          version: langDef?.pistonVersion || '*',
          files: [{ name: langDef?.defaultFilename || 'main.code', content: request.sourceCode }],
          stdin: request.stdin,
          args: request.args,
          compile_timeout: request.compileTimeoutMs || COMPILATION_LIMITS.defaultCompileTimeoutMs,
          run_timeout: request.runTimeoutMs || COMPILATION_LIMITS.defaultRunTimeoutMs
        });

        // Race with context cancellation
        const executionRes: any = await Promise.race([
          execPromise,
          new Promise((_, reject) => {
            ctx.signal.addEventListener('abort', () => {
              reject(new CompilationError({
                errorCode: 'INVALID_REQUEST',
                message: ctx.getCancelReason() || 'Compilation cancelled',
                compilationId: ctx.compilationId,
                stage: 'CODE_GENERATION'
              }));
            });
          })
        ]);

        const execDuration = ctx.getStages().find(s => s.stageId === stgExecId)?.durationMs || 0;
        CompilationMetrics.recordStageDuration('CODE_GENERATION', execDuration);

        // Map execution output
        if (executionRes.compile && executionRes.compile.code !== 0) {
          finalStatus = 'FAILED';
          ctx.failStage(stgExecId, 'Compilation failed', { exitCode: executionRes.compile.code });
          outputResult = {
            stdout: executionRes.compile.stdout || '',
            stderr: executionRes.compile.stderr || 'Compilation error',
            exitCode: executionRes.compile.code,
            signal: executionRes.compile.signal
          };
          ctx.addDiagnostic({
            severity: 'error',
            message: executionRes.compile.stderr || 'Compilation error occurred',
            stage: 'CODE_GENERATION',
            code: 'COMP_ERR'
          });
        } else if (executionRes.run && executionRes.run.code !== 0) {
          if (executionRes.run.signal === 'SIGKILL' || executionRes.run.stderr?.includes('timed out')) {
            finalStatus = 'TIMEOUT';
            CompilationMetrics.recordTimeout();
          } else {
            finalStatus = 'FAILED';
          }
          ctx.failStage(stgExecId, `Process exited with code ${executionRes.run.code}`);
          outputResult = {
            stdout: executionRes.run.stdout || '',
            stderr: executionRes.run.stderr || '',
            exitCode: executionRes.run.code,
            signal: executionRes.run.signal
          };
        } else {
          finalStatus = 'SUCCEEDED';
          ctx.completeStage(stgExecId, 'executable-binary', { exitCode: 0 });
          outputResult = {
            stdout: executionRes.run?.stdout || executionRes.compile?.stdout || '',
            stderr: executionRes.run?.stderr || '',
            exitCode: 0
          };
        }
      }

    } catch (err: any) {
      if (ctx.isCancelled()) {
        finalStatus = 'CANCELLED';
        CompilationMetrics.recordCancellation();
      } else if (err.name === 'AbortError' || err.message?.includes('timeout')) {
        finalStatus = 'TIMEOUT';
        CompilationMetrics.recordTimeout();
      } else if (err instanceof CompilationError) {
        finalStatus = err.errorCode === 'QUEUE_FULL' ? 'RESOURCE_LIMIT' : 'FAILED';
        CompilationMetrics.recordFailure();
      } else {
        finalStatus = 'FAILED';
        CompilationMetrics.recordFailure();
      }

      outputResult = outputResult || {
        stdout: '',
        stderr: err.message || 'Unknown compilation error',
        exitCode: 1
      };
    } finally {
      // 5. Always release worker slot & clean up context
      this.releaseSlot();
      this.activeContexts.delete(ctx.compilationId);
    }

    const totalDurationMs = Date.now() - startTime;
    if (finalStatus === 'SUCCEEDED') {
      CompilationMetrics.recordSuccess(totalDurationMs);
    } else if (finalStatus !== 'CANCELLED') {
      CompilationMetrics.recordFailure(totalDurationMs);
    }

    // 6. Build trace and record in store
    const trace = ctx.toTrace(request.sourceCode, sourceHash, totalDurationMs);
    this.storeTrace(ctx.compilationId, trace, fullAstData, outputResult);

    const result: CompilationResult = {
      compilationId: ctx.compilationId,
      requestId: request.requestId,
      status: finalStatus,
      sourceHash,
      language: request.language,
      compilerVersion: APPLICATION_VERSION,
      durationMs: totalDurationMs,
      stages: trace.stages,
      diagnostics: trace.diagnostics,
      statistics: trace.statistics,
      output: outputResult,
      artifacts: {
        astSummary: fullAstData ? { rootType: fullAstData.type || fullAstData.name, nodeCount: fullAstData.children?.length || 1 } : undefined,
        hasFullTrace: true
      },
      traceMetadata: {
        applicationVersion: APPLICATION_VERSION,
        compilerVersion: APPLICATION_VERSION,
        target: request.target || 'native',
        optimizationLevel: request.optimizationLevel || 'O0',
        createdAt: new Date().toISOString()
      }
    };

    // 7. Store in cache if successful
    if (finalStatus === 'SUCCEEDED') {
      CompilationCache.set(sourceHash, result);
    }

    logger.info(`[Compilation] ${ctx.compilationId} finished with status ${finalStatus} in ${totalDurationMs}ms`);
    return result;
  }

  private static storeTrace(compilationId: string, trace: CompilationTrace, fullAst?: any, output?: any): void {
    if (this.traces.size >= this.MAX_STORED_TRACES) {
      // Evict oldest trace
      const oldestKey = this.traces.keys().next().value;
      if (oldestKey) this.traces.delete(oldestKey);
    }

    this.traces.set(compilationId, {
      trace,
      fullAst,
      output,
      createdAt: Date.now()
    });
  }

  public static getTrace(compilationId: string): CompilationTrace | null {
    const entry = this.traces.get(compilationId);
    return entry ? entry.trace : null;
  }

  public static getArtifact(compilationId: string, artifactType: string): any {
    const entry = this.traces.get(compilationId);
    if (!entry) return null;

    switch (artifactType.toLowerCase()) {
      case 'ast': return entry.fullAst || null;
      case 'output': return entry.output || null;
      case 'trace': return entry.trace;
      case 'diagnostics': return entry.trace.diagnostics;
      case 'statistics': return entry.trace.statistics;
      default: return null;
    }
  }

  public static getSummary(compilationId: string): any {
    const entry = this.traces.get(compilationId);
    if (!entry) return null;
    return {
      compilationId,
      status: entry.trace.stages.some(s => s.status === 'FAILED') ? 'FAILED' : 'SUCCEEDED',
      durationMs: entry.trace.statistics.totalDurationMs,
      diagnosticsCount: entry.trace.diagnostics.length,
      statistics: entry.trace.statistics
    };
  }
}
