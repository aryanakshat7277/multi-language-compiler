import { Request, Response, NextFunction } from 'express';
import { CompilationOrchestrator } from '../services/compilation/compilationOrchestrator';
import { CompilationMetrics } from '../services/compilation/compilationMetrics';
import { CompilationRequest } from '../domain/compilation/compilationTypes';
import { CompilationError } from '../domain/compilation/compilationErrors';
import prisma from '../config/database';

export const createCompilation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = req.body as CompilationRequest;
    if (!payload.requestId) {
      payload.requestId = `req-${Date.now()}`;
    }

    const result = await CompilationOrchestrator.execute(payload);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof CompilationError) {
      res.status(err.errorCode === 'QUEUE_FULL' ? 503 : 400).json(err.toClientResponse());
      return;
    }
    next(err);
  }
};

export const getCompilation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const summary = CompilationOrchestrator.getSummary(id);
    if (!summary) {
      res.status(404).json({ error: 'Compilation not found or expired from cache' });
      return;
    }
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};

export const getCompilationTrace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const trace = CompilationOrchestrator.getTrace(id);
    if (!trace) {
      res.status(404).json({ error: 'Compilation trace not found or expired' });
      return;
    }
    res.status(200).json(trace);
  } catch (err) {
    next(err);
  }
};

export const getCompilationArtifact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const type = String(req.params.type);
    const artifact = CompilationOrchestrator.getArtifact(id, type);
    if (!artifact) {
      res.status(404).json({ error: `Artifact '${type}' for compilation ${id} not found` });
      return;
    }
    res.status(200).json({ compilationId: id, artifactType: type, data: artifact });
  } catch (err) {
    next(err);
  }
};

export const cancelCompilation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const reason = req.body?.reason || 'User cancelled';
    const cancelled = CompilationOrchestrator.cancelCompilation(id, reason);

    if (cancelled) {
      res.status(200).json({ success: true, message: `Compilation ${id} cancelled successfully` });
    } else {
      res.status(404).json({ error: `Compilation ${id} is not active or has already completed` });
    }
  } catch (err) {
    next(err);
  }
};

export const getMetrics = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(CompilationMetrics.getSnapshot());
};

export const getLiveness = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
};

export const getReadiness = async (req: Request, res: Response): Promise<void> => {
  let dbHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const status = dbHealthy ? 'READY' : 'DEGRADED';
  res.status(dbHealthy ? 200 : 503).json({
    status,
    database: dbHealthy ? 'CONNECTED' : 'UNAVAILABLE',
    timestamp: new Date().toISOString()
  });
};
