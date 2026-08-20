import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { getLanguageConfig } from '../config/languages';
import { DockerSandbox } from '../sandbox/DockerSandbox';
import { logger } from '../utils/logger';

export interface ExecutionJobData {
  type: 'EXECUTION' | 'EVALUATION';
  languageId: string;
  files: { name: string; content: string }[];
  stdin?: string;
  testCases?: { id: string; index: number; input: string; expectedOutput: string; timeLimit?: number }[];
  problemId?: string;
}

export class ExecutionWorker {
  private worker: Worker;
  private redisPub: Redis;

  constructor() {
    const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.redisPub = new Redis(env.REDIS_URL);

    this.worker = new Worker('execution', this.processJob.bind(this), {
      connection,
      concurrency: env.WORKER_CONCURRENCY,
    });

    this.worker.on('completed', (job) => {
      logger.info(`Job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${job?.id}`, { error: err.message });
      if (job) {
        this.publishStatus(job.id as string, 'FAILED', { error: err.message });
      }
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error', { error: err });
    });
  }

  private async processJob(job: Job<ExecutionJobData>): Promise<any> {
    const { type, languageId, files, stdin, testCases } = job.data;
    
    await this.publishStatus(job.id as string, 'STARTING');
    logger.info(`Processing job ${job.id} for language ${languageId}`);

    const language = getLanguageConfig(languageId);
    const sandbox = new DockerSandbox({
      memoryMb: language.memoryLimitMb,
    });

    try {
      await sandbox.create();
      await sandbox.copyFiles(files);

      if (language.compileRequired) {
        await this.publishStatus(job.id as string, 'COMPILING');
        const compileResult = await sandbox.compile(language, files);
        
        if (!compileResult.success) {
          const result = { status: 'COMPILATION_ERROR', ...compileResult };
          await this.publishStatus(job.id as string, 'COMPLETED', result);
          return result;
        }
      }

      if (type === 'EXECUTION') {
        await this.publishStatus(job.id as string, 'RUNNING');
        const result = await sandbox.execute(language, stdin);
        
        const finalResult = {
          status: result.timedOut ? 'TIME_LIMIT_EXCEEDED' : result.oomKilled ? 'MEMORY_LIMIT_EXCEEDED' : (result.exitCode === 0 ? 'SUCCESS' : 'RUNTIME_ERROR'),
          ...result
        };
        await this.publishStatus(job.id as string, 'COMPLETED', finalResult);
        return finalResult;
        
      } else if (type === 'EVALUATION' && testCases) {
        const results = [];
        let anyFailed = false;

        for (const testCase of testCases) {
          await this.publishStatus(job.id as string, 'RUNNING', { testCase: testCase.index });
          const result = await sandbox.execute(language, testCase.input, testCase.timeLimit);
          
          const passed = result.exitCode === 0 && !result.timedOut && !result.oomKilled && result.stdout.trim() === testCase.expectedOutput.trim();
          if (!passed) anyFailed = true;

          results.push({
            testCaseId: testCase.id,
            status: result.timedOut ? 'TIME_LIMIT_EXCEEDED' : result.oomKilled ? 'MEMORY_LIMIT_EXCEEDED' : (result.exitCode !== 0 ? 'RUNTIME_ERROR' : (passed ? 'ACCEPTED' : 'WRONG_ANSWER')),
            ...result,
            passed
          });
        }

        const finalResult = { 
          status: anyFailed ? 'EVALUATION_FAILED' : 'ACCEPTED',
          testResults: results 
        };
        await this.publishStatus(job.id as string, 'COMPLETED', finalResult);
        return finalResult;
      }
      
      throw new Error(`Invalid job type or missing data: ${type}`);

    } finally {
      await sandbox.destroy();
    }
  }

  private async publishStatus(jobId: string, status: string, data?: any): Promise<void> {
    await this.redisPub.publish('job-status', JSON.stringify({
      jobId,
      status,
      data,
      timestamp: Date.now()
    }));
  }
}
