import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [userCount, problemCount, submissionCount, executionCount, languageCount] = await Promise.all([
      prisma.user.count(),
      prisma.problem.count(),
      prisma.submission.count(),
      prisma.executionJob.count(),
      prisma.language.count({ where: { enabled: true } })
    ]);
    res.status(200).json({ users: userCount, problems: problemCount, submissions: submissionCount, executions: executionCount, languages: languageCount });
  } catch (error) { next(error); }
};

export const getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dbHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: { api: true, database: dbHealthy }
    });
  } catch (error) { next(error); }
};
