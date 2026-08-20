import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { QueueService } from '../services/queueService';
import { AuthRequest } from '../middleware/auth';
import { CompilerService } from '../services/compilerService';

export const createExecution = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { languageId, files, stdin } = req.body;
    const userId = req.user?.id;
    const language = await prisma.language.findUnique({ where: { id: languageId } });
    if (!language) { res.status(400).json({ error: 'Unsupported language' }); return; }
    
    // Instead of QueueService, execute immediately using CompilerService
    const result = await CompilerService.execute(userId, {
      language: languageId,
      files,
      stdin,
      compileTimeout: language.timeLimitMs,
      runTimeout: language.timeLimitMs
    });
    
    res.status(201).json({ jobId: result.executionId, status: result.status });
  } catch (error) { next(error); }
};

export const getExecutionStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const job = await prisma.executionJob.findUnique({ where: { id } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    res.status(200).json(job);
  } catch (error) { next(error); }
};

export const cancelExecution = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const job = await prisma.executionJob.findUnique({ where: { id } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (['COMPLETED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'TIMEOUT'].includes(job.status)) {
      res.status(400).json({ error: 'Job already finished' }); return; }
    await QueueService.cancelJob('execution', id);
    const updatedJob = await prisma.executionJob.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.status(200).json(updatedJob);
  } catch (error) { next(error); }
};
