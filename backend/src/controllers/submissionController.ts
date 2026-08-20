import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { QueueService } from '../services/queueService';
import { EvaluationService } from '../services/evaluationService';
import { AuthRequest } from '../middleware/auth';

export const createSubmission = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { problemId, languageId, files } = req.body;
    let userId = req.user?.id;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || 'guest_user';
    }
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) { res.status(404).json({ error: 'Problem not found' }); return; }
    const language = await prisma.language.findUnique({ where: { id: languageId } });
    if (!language) { res.status(400).json({ error: 'Unsupported language' }); return; }
    const submission = await prisma.submission.create({
      data: { userId, problemId, languageId, status: 'PENDING',
        files: { create: files.map((f: any) => ({ filename: f.filename, content: f.content })) } }
    });
    // Trigger evaluation asynchronously via Piston
    EvaluationService.evaluateSubmission(submission.id).catch((err) => {
      console.error('Failed to evaluate submission:', err);
    });

    res.status(201).json({ submissionId: submission.id, status: submission.status });
  } catch (error) { next(error); }
};

export const getSubmissionById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const submission = await prisma.submission.findUnique({ where: { id },
      include: { files: true, testResults: { include: { testCase: { select: { points: true, isHidden: true } } } },
        language: true, problem: { select: { title: true, slug: true } } } });
    if (!submission) { res.status(404).json({ error: 'Submission not found' }); return; }
    // Hide actual output for hidden test cases for students
    const result: any = { ...submission };
    if (req.user?.role === 'STUDENT') {
      result.testResults = submission.testResults.map((tr: any) => {
        if (tr.testCase?.isHidden) { return { ...tr, actualOutput: 'Hidden' }; }
        return tr;
      });
    }
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const getUserSubmissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({ where: { userId }, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' }, include: { language: true, problem: { select: { title: true } } } }),
      prisma.submission.count({ where: { userId } })
    ]);
    res.status(200).json({ data: submissions, total, page, pageSize });
  } catch (error) { next(error); }
};
