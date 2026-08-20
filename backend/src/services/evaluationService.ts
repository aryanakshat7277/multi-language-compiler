import prisma from '../config/database';
import { QueueService } from './queueService';
import { pistonClient } from './piston/pistonClient';
import { languageRegistry } from './piston/languageRegistry';
import { PistonExecuteRequest } from './piston/pistonTypes';

/**
 * Output comparison strategies for test case evaluation.
 */
export type ComparisonStrategy = 'exact' | 'whitespace' | 'token' | 'numeric';

interface TestCaseResult {
  testCaseId: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'TIMEOUT' | 'MEMORY_LIMIT';
  actualOutput: string | null;
  executionTimeMs: number | null;
  memoryUsedMb: number | null;
}

interface EvaluationReport {
  submissionId: string;
  status: string;
  score: number;
  totalScore: number;
  testResults: TestCaseResult[];
  executionTimeMs: number;
  memoryUsedMb: number;
}

export class EvaluationService {
  /**
   * Evaluate a submission directly using Piston.
   */
  static async evaluateSubmission(submissionId: string): Promise<string> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: {
          include: { testCases: { orderBy: { orderIndex: 'asc' } } }
        },
        language: true,
        files: true
      }
    });

    if (!submission) throw new Error('Submission not found');
    if (!submission.problem) throw new Error('Problem not found for submission');

    // Update status to QUEUED
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'QUEUED' }
    });

    const langDef = await languageRegistry.getLanguageByAppId(submission.languageId);
    if (!langDef) throw new Error(`Language not supported: ${submission.languageId}`);

    const workerResults = [];
    
    // Evaluate each test case
    for (const tc of submission.problem.testCases) {
      const pistonReq: PistonExecuteRequest = {
        language: langDef.pistonLanguage,
        version: langDef.pistonVersion,
        files: submission.files.map(f => ({ name: f.filename, content: f.content })),
        stdin: tc.input,
        compile_timeout: submission.problem.timeLimit,
        run_timeout: submission.problem.timeLimit
      };

      const start = Date.now();
      let stdout = '';
      let stderr = '';
      let exitCode = 1;
      let timedOut = false;
      let oomKilled = false;

      try {
        let pistonRes: any;
        try {
          pistonRes = await pistonClient.executeCode(pistonReq);
        } catch {
          pistonRes = await (await import('./localExecutorService')).LocalExecutorService.execute(pistonReq);
        }
        
        if (pistonRes.compile && pistonRes.compile.code !== 0) {
          stdout = pistonRes.compile.stdout;
          stderr = pistonRes.compile.stderr;
          exitCode = pistonRes.compile.code;
        } else {
          stdout = pistonRes.run.stdout;
          stderr = pistonRes.run.stderr;
          exitCode = pistonRes.run.code;
          if (pistonRes.run.signal === 'SIGKILL') timedOut = true;
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          timedOut = true;
        }
        stderr = error.message;
      }
      
      const executionTimeMs = Date.now() - start;

      workerResults.push({
        testCaseId: tc.id,
        stdout,
        stderr,
        exitCode,
        timedOut,
        oomKilled,
        executionTimeMs
      });
    }

    // Process results using existing logic
    await this.processEvaluationResults(submissionId, workerResults);

    return submissionId;
  }

  /**
   * Process evaluation results from the worker and update the submission.
   */
  static async processEvaluationResults(
    submissionId: string,
    workerResults: Array<{
      testCaseId: string;
      stdout: string;
      stderr: string;
      exitCode: number;
      timedOut: boolean;
      oomKilled: boolean;
      executionTimeMs: number;
    }>
  ): Promise<EvaluationReport> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: {
          include: { testCases: { orderBy: { orderIndex: 'asc' } } }
        }
      }
    });

    if (!submission || !submission.problem) {
      throw new Error('Submission or problem not found');
    }

    let totalScore = 0;
    let earnedScore = 0;
    let maxTime = 0;
    let maxMemory = 0;
    const testResults: TestCaseResult[] = [];

    for (const tc of submission.problem.testCases) {
      totalScore += tc.points;
      const workerResult = workerResults.find(r => r.testCaseId === tc.id);

      if (!workerResult) {
        testResults.push({
          testCaseId: tc.id,
          status: 'ERROR',
          actualOutput: null,
          executionTimeMs: null,
          memoryUsedMb: null
        });
        continue;
      }

      let status: TestCaseResult['status'];

      if (workerResult.timedOut) {
        status = 'TIMEOUT';
      } else if (workerResult.oomKilled) {
        status = 'MEMORY_LIMIT';
      } else if (workerResult.exitCode !== 0) {
        status = 'ERROR';
      } else {
        // Compare output
        const matches = this.compareOutput(
          tc.expectedOutput,
          workerResult.stdout,
          'whitespace'
        );
        status = matches ? 'PASS' : 'FAIL';
      }

      if (status === 'PASS') {
        earnedScore += tc.points;
      }

      maxTime = Math.max(maxTime, workerResult.executionTimeMs);

      testResults.push({
        testCaseId: tc.id,
        status,
        actualOutput: workerResult.stdout,
        executionTimeMs: workerResult.executionTimeMs,
        memoryUsedMb: null
      });
    }

    // Determine overall status
    const allPassed = testResults.every(r => r.status === 'PASS');
    const hasTimeout = testResults.some(r => r.status === 'TIMEOUT');
    const hasMemoryLimit = testResults.some(r => r.status === 'MEMORY_LIMIT');
    const hasError = testResults.some(r => r.status === 'ERROR');

    let overallStatus: any;
    if (allPassed) {
      overallStatus = 'ACCEPTED';
    } else if (hasTimeout) {
      overallStatus = 'TIME_LIMIT_EXCEEDED';
    } else if (hasMemoryLimit) {
      overallStatus = 'MEMORY_LIMIT_EXCEEDED';
    } else if (hasError) {
      overallStatus = 'RUNTIME_ERROR';
    } else {
      overallStatus = 'WRONG_ANSWER';
    }

    // Save results to database
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: overallStatus,
          score: earnedScore,
          totalScore: totalScore,
          executionTimeMs: maxTime,
        }
      }),
      ...testResults.map(tr =>
        prisma.submissionTestResult.create({
          data: {
            submissionId,
            testCaseId: tr.testCaseId,
            status: tr.status,
            actualOutput: tr.actualOutput,
            executionTimeMs: tr.executionTimeMs,
            memoryUsedMb: tr.memoryUsedMb
          }
        })
      )
    ]);

    // Update user progress
    await this.updateUserProgress(submission.userId);

    return {
      submissionId,
      status: overallStatus,
      score: earnedScore,
      totalScore,
      testResults,
      executionTimeMs: maxTime,
      memoryUsedMb: maxMemory
    };
  }

  /**
   * Compare expected and actual output using the specified strategy.
   */
  static compareOutput(
    expected: string,
    actual: string | null,
    strategy: ComparisonStrategy = 'whitespace'
  ): boolean {
    if (actual === null || actual === undefined) return false;

    switch (strategy) {
      case 'exact':
        return expected === actual;

      case 'whitespace':
        return this.normalizeWhitespace(expected) === this.normalizeWhitespace(actual);

      case 'token':
        return this.tokenCompare(expected, actual);

      case 'numeric':
        return this.numericCompare(expected, actual, 1e-6);

      default:
        return this.normalizeWhitespace(expected) === this.normalizeWhitespace(actual);
    }
  }

  /**
   * Normalize whitespace: trim each line, remove trailing newlines, collapse spaces.
   */
  private static normalizeWhitespace(text: string): string {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Token-based comparison: split into whitespace-separated tokens and compare sequences.
   */
  private static tokenCompare(expected: string, actual: string): boolean {
    const tokenize = (s: string) =>
      s.split(/\s+/).filter(t => t.length > 0);

    const expectedTokens = tokenize(expected);
    const actualTokens = tokenize(actual);

    if (expectedTokens.length !== actualTokens.length) return false;

    return expectedTokens.every((token, i) => token === actualTokens[i]);
  }

  /**
   * Numeric comparison: compare numbers with epsilon tolerance.
   * Falls back to exact string comparison for non-numeric tokens.
   */
  private static numericCompare(expected: string, actual: string, epsilon: number): boolean {
    const tokenize = (s: string) =>
      s.split(/\s+/).filter(t => t.length > 0);

    const expectedTokens = tokenize(expected);
    const actualTokens = tokenize(actual);

    if (expectedTokens.length !== actualTokens.length) return false;

    return expectedTokens.every((expToken, i) => {
      const actToken = actualTokens[i];
      const expNum = parseFloat(expToken);
      const actNum = parseFloat(actToken);

      // If both parse as numbers, compare with tolerance
      if (!isNaN(expNum) && !isNaN(actNum)) {
        return Math.abs(expNum - actNum) <= epsilon;
      }

      // Otherwise, exact string comparison
      return expToken === actToken;
    });
  }

  /**
   * Update user progress statistics after a submission.
   */
  private static async updateUserProgress(userId: string): Promise<void> {
    const stats = await prisma.submission.aggregate({
      where: { userId },
      _count: { id: true },
      _avg: { score: true }
    });

    const acceptedCount = await prisma.submission.count({
      where: { userId, status: 'ACCEPTED' }
    });

    const uniqueSolved = await prisma.submission.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { problemId: true },
      distinct: ['problemId']
    });

    const totalSubmissions = stats._count.id || 0;
    const successRate = totalSubmissions > 0
      ? (acceptedCount / totalSubmissions) * 100
      : 0;

    await prisma.userProgress.upsert({
      where: { userId },
      create: {
        userId,
        problemsSolved: uniqueSolved.length,
        totalSubmissions,
        successRate,
        avgScore: stats._avg.score || 0
      },
      update: {
        problemsSolved: uniqueSolved.length,
        totalSubmissions,
        successRate,
        avgScore: stats._avg.score || 0
      }
    });
  }
}
