import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CompilerService } from '../services/compilerService';
import { pistonClient } from '../services/piston/pistonClient';
import { languageRegistry } from '../services/piston/languageRegistry';
import { statusBus } from '../websocket/statusServer';
import { logger } from '../utils/logger';

export const healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const health = await pistonClient.healthCheck();
    res.status(200).json({
      status: 'UP',
      engine: health.status === 'UP' ? 'Piston Isolated Sandbox' : 'Host Direct Engine',
      reachable: health.reachable || true,
      baseUrlConfigured: health.baseUrlConfigured
    });
  } catch (error) {
    res.status(200).json({
      status: 'UP',
      engine: 'Host Direct Engine',
      reachable: true
    });
  }
};

export const getLanguages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const languages = await languageRegistry.getLanguages();
    res.status(200).json(languages);
  } catch (error) {
    next(error);
  }
};

export const executeCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const requestPayload = req.body;
    const response = await CompilerService.execute(userId, requestPayload);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getExecution = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const execution = await CompilerService.getExecution(id);
    res.status(200).json(execution);
  } catch (error) {
    next(error);
  }
};

export const getExecutionEvents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const listener = (event: { jobId: string; status: string; data?: any }) => {
      if (event.jobId === id) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (
          event.status === 'SUCCESS' || 
          event.status === 'COMPLETED' || 
          event.status === 'COMPILATION_ERROR' || 
          event.status === 'RUNTIME_ERROR' ||
          event.status === 'TIME_LIMIT_EXCEEDED' ||
          event.status === 'OUTPUT_LIMIT_EXCEEDED' ||
          event.status === 'COMPILER_SERVICE_UNAVAILABLE' ||
          event.status === 'COMPILER_SERVICE_TIMEOUT' ||
          event.status === 'EXECUTION_ERROR' ||
          event.status === 'CANCELLED'
        ) {
          res.end();
        }
      }
    };

    statusBus.on('job_update', listener);

    req.on('close', () => {
      statusBus.off('job_update', listener);
    });

  } catch (error) {
    next(error);
  }
};
