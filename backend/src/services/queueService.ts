/**
 * Queue Service — In-process execution for local development.
 * 
 * Replaces BullMQ/Redis dependency with direct in-process job execution.
 * In production, swap this back to the BullMQ implementation.
 */

import { logger } from '../utils/logger';

type JobHandler = (data: any) => Promise<void>;

const handlers: Record<string, JobHandler> = {};
const jobs: Map<string, { status: string; data: any }> = new Map();

export class QueueService {
  static registerHandler(queueName: string, handler: JobHandler) {
    handlers[queueName] = handler;
  }

  static async addExecutionJob(jobId: string, data: any): Promise<string> {
    jobs.set(jobId, { status: 'queued', data });
    logger.info(`[Queue] Execution job ${jobId} queued`);

    // Execute in background (non-blocking)
    setImmediate(async () => {
      try {
        jobs.set(jobId, { status: 'running', data });
        const handler = handlers['execution'];
        if (handler) {
          await handler(data);
        }
        jobs.set(jobId, { status: 'completed', data });
      } catch (err) {
        logger.error(`[Queue] Execution job ${jobId} failed`, err);
        jobs.set(jobId, { status: 'failed', data });
      }
    });

    return jobId;
  }

  static async addEvaluationJob(submissionId: string, data: any): Promise<string> {
    jobs.set(submissionId, { status: 'queued', data });
    logger.info(`[Queue] Evaluation job ${submissionId} queued`);

    setImmediate(async () => {
      try {
        jobs.set(submissionId, { status: 'running', data });
        const handler = handlers['evaluation'];
        if (handler) {
          await handler(data);
        }
        jobs.set(submissionId, { status: 'completed', data });
      } catch (err) {
        logger.error(`[Queue] Evaluation job ${submissionId} failed`, err);
        jobs.set(submissionId, { status: 'failed', data });
      }
    });

    return submissionId;
  }

  static async getJobStatus(_queueName: 'execution' | 'evaluation', jobId: string) {
    const job = jobs.get(jobId);
    return job ? job.status : null;
  }

  static async cancelJob(_queueName: 'execution' | 'evaluation', jobId: string) {
    const deleted = jobs.delete(jobId);
    return deleted;
  }
}
