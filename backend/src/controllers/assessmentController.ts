import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { aiProvider } from '../services/ai/geminiProvider';

export const createAssessment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, startTime, endTime, durationMinutes, questions } = req.body;
    const assessment = await prisma.assessment.create({
      data: { title, description, createdById: req.user!.id, startTime: new Date(startTime), endTime: new Date(endTime), durationMinutes,
        questions: { create: (questions || []).map((q: any, idx: number) => ({ problemId: q.problemId, points: q.points || 10, orderIndex: idx })) } },
      include: { questions: true }
    });
    res.status(201).json(assessment);
  } catch (error) { next(error); }
};

export const generateAiAssessment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { topic, difficulty, numQuestions } = req.body;
    const assessment = await aiProvider.generateAssessment(
      topic || 'Data Structures & Algorithms',
      difficulty || 'Intermediate',
      numQuestions || 3
    );
    res.status(200).json(assessment);
  } catch (error) { next(error); }
};

export const getAssessments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assessments = await prisma.assessment.findMany({ orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true, submissions: true } } } });
    res.status(200).json(assessments);
  } catch (error) { next(error); }
};

export const getAssessmentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const assessment = await prisma.assessment.findUnique({ where: { id },
      include: { questions: { include: { problem: true }, orderBy: { orderIndex: 'asc' } } } });
    if (!assessment) { res.status(404).json({ error: 'Assessment not found' }); return; }
    res.status(200).json(assessment);
  } catch (error) { next(error); }
};

export const submitAssessment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assessmentId = req.params.id as string;
    const { title, questions, answers } = req.body;

    const gradingReport = await aiProvider.gradeAssessment(
      title || 'Timed Coding Assessment',
      questions || [],
      answers || {}
    );

    if (req.user?.id) {
      await prisma.assessmentSubmission.create({
        data: {
          assessmentId: assessmentId.includes('ai-') ? '00000000-0000-0000-0000-000000000000' : assessmentId,
          userId: req.user.id,
          totalScore: gradingReport.totalScore,
          maxScore: gradingReport.maxScore
        }
      }).catch(() => {});
    }

    res.status(200).json(gradingReport);
  } catch (error) { next(error); }
};

export const getAssessmentResults = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assessmentId = req.params.id as string;
    const results = await prisma.assessmentSubmission.findMany({
      where: { assessmentId }, include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { totalScore: 'desc' }
    });
    res.status(200).json(results);
  } catch (error) { next(error); }
};
