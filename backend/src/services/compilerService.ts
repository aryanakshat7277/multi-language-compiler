import { 
  CompilerExecutionRequest, 
  CompilerExecutionResponse, 
  CompilerStatus, 
  PistonExecuteRequest 
} from './piston/pistonTypes';
import { pistonClient } from './piston/pistonClient';
import { languageRegistry } from './piston/languageRegistry';
import { CompilerValidator } from './compilerValidator';
import { broadcastJobStatus } from '../websocket/statusServer';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export class CompilerService {
  static async execute(userId: string | undefined, request: CompilerExecutionRequest): Promise<CompilerExecutionResponse> {
    // 1. Validate
    CompilerValidator.validateExecutionRequest(request);

    // 2. Resolve language
    const langDef = await languageRegistry.getLanguageByAppId(request.language);
    if (!langDef) {
      throw new Error(`Language not available: ${request.language}`);
    }

    for (const file of request.files) {
      CompilerValidator.validateFileExtension(file.name, request.language);
    }

    // 3. Create DB Job
    const job = await prisma.executionJob.create({
      data: {
        userId: userId || null,
        type: 'EXECUTION',
        status: 'QUEUED',
        languageId: langDef.id,
        stdin: request.stdin,
        files: {
          create: request.files.map(f => ({
            filename: f.name,
            content: f.content
          }))
        }
      }
    });

    const executionId = job.id;
    const startTime = Date.now();
    let status: CompilerStatus = 'SUBMITTED';

    // Broadcast SUBMITTED
    broadcastJobStatus(executionId, status);

    const pistonReq: PistonExecuteRequest = {
      language: langDef.pistonLanguage,
      version: langDef.pistonVersion,
      files: request.files.map(f => ({
        name: f.name,
        content: f.content
      })),
      stdin: request.stdin,
      args: request.args,
      compile_timeout: request.compileTimeout || langDef.defaultCompileTimeout,
      run_timeout: request.runTimeout || langDef.defaultRunTimeout
    };

    let compileResult: any = undefined;
    let runResult: any = undefined;

    try {
      // Broadcast COMPILING / RUNNING
      broadcastJobStatus(executionId, 'RUNNING');

      let pistonRes: any;
      try {
        // Try Piston container first
        pistonRes = await pistonClient.executeCode(pistonReq);
      } catch (pistonErr: any) {
        logger.warn(`Piston offline or unreachable (${pistonErr.message}), falling back to LocalExecutorService`);
        // Seamless fallback to host runtime execution
        pistonRes = await (await import('./localExecutorService')).LocalExecutorService.execute(pistonReq);
      }
      
      compileResult = pistonRes.compile;
      runResult = pistonRes.run;

      // 5. Normalize Result
      if (pistonRes.compile && pistonRes.compile.code !== 0) {
        status = 'COMPILATION_ERROR';
      } else if (pistonRes.run && pistonRes.run.code !== 0) {
        if (pistonRes.run.signal === 'SIGKILL') {
          status = 'TIME_LIMIT_EXCEEDED';
        } else {
          status = 'RUNTIME_ERROR';
        }
      } else {
        status = 'SUCCESS';
      }
      
    } catch (error: any) {
      logger.error(`Execution failed for job ${executionId}:`, error);
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        status = 'TIME_LIMIT_EXCEEDED';
        runResult = {
          stdout: '',
          stderr: 'Execution timed out after waiting for compiler response.',
          code: -1,
          signal: 'SIGKILL'
        };
      } else {
        status = 'RUNTIME_ERROR';
        runResult = {
          stdout: '',
          stderr: `Execution error: ${error.message || error}`,
          code: 1,
          signal: null
        };
      }
    }

    const executionTimeMs = Date.now() - startTime;
    
    // Map CompilerStatus to Prisma JobStatus
    const mapToJobStatus = (s: CompilerStatus): any => {
      switch(s) {
        case 'SUCCESS': return 'COMPLETED';
        case 'TIME_LIMIT_EXCEEDED': return 'TIMEOUT';
        case 'COMPILER_SERVICE_UNAVAILABLE':
        case 'COMPILER_SERVICE_TIMEOUT':
        case 'EXECUTION_ERROR': return 'SYSTEM_ERROR';
        case 'COMPILATION_ERROR': return 'COMPILATION_ERROR';
        case 'RUNTIME_ERROR': return 'RUNTIME_ERROR';
        default: return 'SYSTEM_ERROR';
      }
    };

    // 6. Save back to DB with safe signed 32-bit exit code
    const rawExitCode = runResult?.code ?? compileResult?.code;
    const safeExitCode = typeof rawExitCode === 'number' ? (rawExitCode | 0) : null;

    await prisma.executionJob.update({
      where: { id: executionId },
      data: {
        status: mapToJobStatus(status),
        stdout: runResult?.stdout || compileResult?.stdout || null,
        stderr: runResult?.stderr || compileResult?.stderr || null,
        exitCode: safeExitCode,
        executionTimeMs
      }
    });

    // 7. Broadcast COMPLETED (or final status)
    broadcastJobStatus(executionId, status === 'SUCCESS' ? 'COMPLETED' : status);

    return {
      executionId,
      status,
      language: request.language,
      version: langDef.pistonVersion,
      compile: compileResult ? {
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
        code: compileResult.code,
        signal: compileResult.signal
      } : undefined,
      run: runResult ? {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        code: runResult.code,
        signal: runResult.signal
      } : undefined,
      executionTimeMs,
      createdAt: new Date().toISOString()
    };
  }

  static async getExecution(executionId: string): Promise<any> {
    const job = await prisma.executionJob.findUnique({
      where: { id: executionId },
      include: { files: true }
    });

    if (!job) {
      throw new Error(`Execution job not found: ${executionId}`);
    }

    return job;
  }
}
