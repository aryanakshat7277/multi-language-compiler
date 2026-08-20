import prisma from '../config/database';
import { Difficulty } from '@prisma/client';

export class ProblemService {
  static async getProblems(filters: any, page: number, pageSize: number) {
    const where: any = {};
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { tags: { contains: filters.search } }
      ];
    }

    const [data, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, title: true, slug: true, difficulty: true, tags: true }
      }),
      prisma.problem.count({ where })
    ]);

    return { data, total, page, pageSize };
  }

  static async getProblemById(id: string, includeHiddenTests = false) {
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
            points: true,
            orderIndex: true
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (problem && !includeHiddenTests) {
      problem.testCases = problem.testCases.map(tc => {
        if (tc.isHidden) {
          tc.expectedOutput = 'Hidden';
          tc.input = 'Hidden';
        }
        return tc;
      });
    }

    return problem;
  }

  static async createProblem(userId: string, data: any) {
    return prisma.problem.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        difficulty: data.difficulty as Difficulty,
        constraints: data.constraints,
        inputFormat: data.inputFormat,
        outputFormat: data.outputFormat,
        timeLimit: data.timeLimit,
        memoryLimit: data.memoryLimit,
        tags: data.tags || [],
        createdById: userId,
        testCases: {
          create: data.testCases?.map((tc: any, idx: number) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden || false,
            points: tc.points || 10,
            orderIndex: idx
          })) || []
        }
      }
    });
  }

  static async updateProblem(id: string, data: any) {
    return prisma.problem.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        timeLimit: data.timeLimit,
        memoryLimit: data.memoryLimit,
        tags: data.tags
      }
    });
  }

  static async deleteProblem(id: string) {
    return prisma.problem.delete({ where: { id } });
  }
}
