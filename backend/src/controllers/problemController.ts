import { Request, Response, NextFunction } from 'express';
import { ProblemService } from '../services/problemService';
import { AuthRequest } from '../middleware/auth';

export const getProblems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const filters = { difficulty: req.query.difficulty as string | undefined, search: req.query.search as string | undefined };
    const result = await ProblemService.getProblems(filters, page, pageSize);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const getProblemById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const isInstructorOrAdmin = !!req.user && ['INSTRUCTOR', 'ADMIN'].includes(req.user.role);
    const problem = await ProblemService.getProblemById(id, isInstructorOrAdmin);
    if (!problem) { res.status(404).json({ error: 'Problem not found' }); return; }
    res.status(200).json(problem);
  } catch (error) { next(error); }
};

export const createProblem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const problem = await ProblemService.createProblem(req.user!.id, req.body);
    res.status(201).json(problem);
  } catch (error) { next(error); }
};

export const updateProblem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const problem = await ProblemService.updateProblem(id, req.body);
    res.status(200).json(problem);
  } catch (error) { next(error); }
};

export const deleteProblem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    await ProblemService.deleteProblem(id);
    res.status(204).send();
  } catch (error) { next(error); }
};
