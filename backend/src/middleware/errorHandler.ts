import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: err.message && err.status ? err.message : 'Internal Server Error'
  });
};
