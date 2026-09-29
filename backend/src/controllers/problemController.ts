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

export const getDailyProblems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { aiProvider } = await import('../services/ai/geminiProvider');
    const prisma = (await import('../config/database')).default;

    const userId = req.user?.id || 'guest';
    const todayStr = new Date().toISOString().split('T')[0];
    const dailyTag = `daily-${userId}-${todayStr}`;
    const forceRegenerate = req.query.regenerate === 'true';

    // 1. Check if user already has 5 problems generated for today
    if (!forceRegenerate) {
      const existing = await prisma.problem.findMany({
        where: {
          tags: { contains: dailyTag }
        },
        include: {
          testCases: true
        }
      });

      if (existing.length >= 5) {
        res.status(200).json({
          date: todayStr,
          source: 'cache',
          problems: existing.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            difficulty: p.difficulty,
            category: p.inputFormat || 'Algorithms',
            timeLimit: p.timeLimit,
            memoryLimit: p.memoryLimit,
            acceptanceRate: 75,
            points: p.difficulty === 'EASY' ? 100 : p.difficulty === 'MEDIUM' ? 200 : 350,
            solved: false
          }))
        });
        return;
      }
    }

    // 2. Analyze user's compiler practice history
    let practiceContext = '';
    let preferredLanguage = 'javascript';

    if (req.user?.id) {
      const recentExecs = await prisma.executionJob.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { language: true }
      });

      const recentSubs = await prisma.submission.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { problem: true, files: true, language: true }
      });

      if (recentExecs.length > 0) {
        preferredLanguage = recentExecs[0].languageId || 'javascript';
        practiceContext += `Recent compiler executions in ${preferredLanguage}: ` + 
          recentExecs.map(e => `[${e.languageId}: status=${e.status}]`).join(', ') + '. ';
      }

      if (recentSubs.length > 0) {
        practiceContext += `Recent problem attempts: ` + 
          recentSubs.map(s => `[${s.problem.title} (${s.status})]`).join(', ') + '. ';
      }
    }

    if (!practiceContext) {
      practiceContext = 'Practicing fundamental algorithms, two-pointer arrays, frequency maps, sorting, and conditional loops.';
    }

    // 3. Generate 5 daily problems using AI
    const generated = await aiProvider.generateDailyProblems(practiceContext, preferredLanguage);

    // 4. Find valid user to associate as author
    const author = req.user?.id 
      ? await prisma.user.findUnique({ where: { id: req.user.id } })
      : await prisma.user.findFirst();

    const authorId = author?.id || (await prisma.user.findFirst())?.id;

    if (!authorId) {
      res.status(200).json({ date: todayStr, source: 'ai', problems: generated });
      return;
    }

    // 5. Persist the 5 problems in Prisma DB so they can be opened and solved
    const savedProblems = [];
    for (let i = 0; i < generated.length; i++) {
      const item = generated[i];
      const uniqueSlug = `${item.slug}-${userId.slice(0, 6)}-${todayStr}-${i + 1}`;
      
      const created = await prisma.problem.create({
        data: {
          title: item.title,
          slug: uniqueSlug,
          description: item.description,
          difficulty: (item.difficulty as any) || 'EASY',
          timeLimit: item.timeLimit || 2000,
          memoryLimit: item.memoryLimit || 128,
          inputFormat: item.category || 'Algorithms',
          outputFormat: item.outputFormat || '',
          constraints: item.constraints || '',
          tags: JSON.stringify([dailyTag, 'daily-challenge', ...(item.tags || [])]),
          createdById: authorId,
          testCases: {
            create: (item.testCases || []).map((tc, tcIdx) => ({
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              points: 20,
              orderIndex: tcIdx
            }))
          }
        },
        include: { testCases: true }
      });

      savedProblems.push({
        id: created.id,
        title: created.title,
        slug: created.slug,
        difficulty: created.difficulty,
        category: item.category || 'Algorithms',
        timeLimit: created.timeLimit,
        memoryLimit: created.memoryLimit,
        acceptanceRate: item.acceptanceRate || 75,
        points: item.points || 100,
        solved: false
      });
    }

    res.status(200).json({
      date: todayStr,
      source: 'ai_generated',
      practiceContext,
      problems: savedProblems
    });
  } catch (error) {
    next(error);
  }
};

