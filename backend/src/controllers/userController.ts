import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = (req.query.search as string) || '';
    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { displayName: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, email: true, displayName: true, role: true, createdAt: true } }),
      prisma.user.count({ where })
    ]);
    res.status(200).json({ data: users, total, page, pageSize });
  } catch (error) { next(error); }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id },
      select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, bio: true, createdAt: true, progress: true } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.status(200).json(user);
  } catch (error) { next(error); }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;
    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
    const user = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, email: true, role: true } });
    res.status(200).json(user);
  } catch (error) { next(error); }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { next(error); }
};

export const getMyStats = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(200).json({
        problemsSolved: 0,
        totalSubmissions: 0,
        acceptedSubmissions: 0,
        passRate: 0,
        solvedBreakdown: { easy: 0, medium: 0, hard: 0 },
        assessmentsCompleted: 0,
        leaderboardRank: null,
        eloRating: 1200,
        activityWave: [
          { day: 'Sun', executions: 0, submissions: 0, activity: 0 },
          { day: 'Mon', executions: 0, submissions: 0, activity: 0 },
          { day: 'Tue', executions: 0, submissions: 0, activity: 0 },
          { day: 'Wed', executions: 0, submissions: 0, activity: 0 },
          { day: 'Thu', executions: 0, submissions: 0, activity: 0 },
          { day: 'Fri', executions: 0, submissions: 0, activity: 0 },
          { day: 'Sat', executions: 0, submissions: 0, activity: 0 }
        ],
        latestComplexity: null
      });
      return;
    }

    const [userSubmissions, totalSubmissions, completedAssessments] = await Promise.all([
      prisma.submission.findMany({
        where: { userId },
        include: { problem: { select: { difficulty: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.submission.count({ where: { userId } }),
      prisma.assessmentSubmission.count({ where: { userId } })
    ]);

    const acceptedSubs = userSubmissions.filter(s => s.status === 'ACCEPTED');
    const solvedProblemIds = new Set(acceptedSubs.map(s => s.problemId));
    const problemsSolved = solvedProblemIds.size;
    const acceptedCount = acceptedSubs.length;
    const passRate = totalSubmissions > 0 ? Math.round((acceptedCount / totalSubmissions) * 100) : 0;

    const solvedBreakdown = { easy: 0, medium: 0, hard: 0 };
    const countedProblems = new Set<string>();
    for (const sub of acceptedSubs) {
      if (sub.problemId && !countedProblems.has(sub.problemId)) {
        countedProblems.add(sub.problemId);
        const diff = (sub.problem?.difficulty || '').toUpperCase();
        if (diff === 'EASY') solvedBreakdown.easy++;
        else if (diff === 'HARD') solvedBreakdown.hard++;
        else solvedBreakdown.medium++;
      }
    }

    let leaderboardRank: number | null = null;
    const allUsers = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      select: {
        id: true,
        submissions: {
          where: { status: 'ACCEPTED' },
          select: { problemId: true }
        },
        _count: { select: { submissions: true } }
      }
    });

    const scoredList = allUsers.map(u => {
      const distinctSolved = new Set(u.submissions.map(s => s.problemId)).size;
      const score = (distinctSolved * 100) + (u._count.submissions * 5);
      return { id: u.id, score, distinctSolved };
    }).sort((a, b) => b.score - a.score || b.distinctSolved - a.distinctSolved);

    const userRankIndex = scoredList.findIndex(u => u.id === userId);
    if (userRankIndex >= 0 && totalSubmissions > 0) {
      leaderboardRank = userRankIndex + 1;
    }

    const eloRating = 1200 + (problemsSolved * 25) + (acceptedCount * 5);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentJobs, recentUserSubs] = await Promise.all([
      prisma.executionJob.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true }
      }),
      prisma.submission.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true }
      })
    ]);

    const activityWave: { day: string; executions: number; submissions: number; activity: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      const dayLabel = days[dayStart.getDay()];

      const execCount = recentJobs.filter(j => j.createdAt >= dayStart && j.createdAt < dayEnd).length;
      const subCount = recentUserSubs.filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd).length;

      activityWave.push({
        day: dayLabel,
        executions: execCount,
        submissions: subCount,
        activity: execCount + subCount
      });
    }

    const latestAnalysis = await prisma.codeAnalysis.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const complexityJson: any = latestAnalysis?.complexityData;
    const qualityJson: any = latestAnalysis?.qualityData;

    res.status(200).json({
      problemsSolved,
      totalSubmissions,
      acceptedSubmissions: acceptedCount,
      passRate,
      solvedBreakdown,
      assessmentsCompleted: completedAssessments,
      leaderboardRank,
      eloRating,
      activityWave,
      latestComplexity: latestAnalysis ? {
        cyclomaticComplexity: complexityJson?.cyclomaticComplexity || 1,
        maintainabilityIndex: qualityJson?.maintainabilityIndex || 85,
        linesOfCode: complexityJson?.linesOfCode || 10,
        halsteadDifficulty: complexityJson?.halsteadDifficulty || 5
      } : null
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemTelemetry = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [jobCount, subCount, jobAvg, subAvg, languages] = await Promise.all([
      prisma.executionJob.count(),
      prisma.submission.count(),
      prisma.executionJob.aggregate({ _avg: { executionTimeMs: true } }),
      prisma.submission.aggregate({ _avg: { executionTimeMs: true } }),
      prisma.language.findMany({ where: { enabled: true }, select: { id: true, displayName: true, version: true } })
    ]);

    const totalRuns = jobCount + subCount;
    const validAvgs = [jobAvg._avg.executionTimeMs, subAvg._avg.executionTimeMs].filter((v): v is number => typeof v === 'number' && v > 0);
    const avgRuntimeMs = validAvgs.length > 0 ? +(validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(1) : 42.0;

    res.status(200).json({
      totalRuns,
      avgRuntimeMs,
      activeRuntimesCount: languages.length,
      languages: languages.map(l => ({
        id: l.id,
        name: l.displayName,
        version: l.version || 'Latest',
        status: 'Active'
      })),
      systemUptimeSeconds: Math.floor(process.uptime())
    });
  } catch (error) {
    next(error);
  }
};
