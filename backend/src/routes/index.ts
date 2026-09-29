import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as languageController from '../controllers/languageController';
import * as executionController from '../controllers/executionController';
import * as problemController from '../controllers/problemController';
import * as submissionController from '../controllers/submissionController';
import * as analysisController from '../controllers/analysisController';
import * as aiController from '../controllers/aiController';
import * as assessmentController from '../controllers/assessmentController';
import * as adminController from '../controllers/adminController';
import * as compilerController from '../controllers/compilerController';
import prisma from '../config/database';
import { parseCode } from '../services/astService';
import { compilationRateLimiter, aiRateLimiter, authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/compiler/health', compilerController.healthCheck);
router.get('/compiler/languages', compilerController.getLanguages);
router.post('/compiler/execute', compilationRateLimiter, optionalAuth, compilerController.executeCode);
router.get('/compiler/executions/:id', optionalAuth, compilerController.getExecution);
router.get('/compiler/executions/:id/events', optionalAuth, compilerController.getExecutionEvents);

router.post('/auth/register', authRateLimiter, validate(z.object({ body: z.object({ email: z.string().email(), password: z.string().min(6), displayName: z.string().min(2) }) })), authController.register);
router.post('/auth/login', authRateLimiter, validate(z.object({ body: z.object({ email: z.string().email(), password: z.string() }) })), authController.login);
router.post('/auth/firebase', authRateLimiter, validate(z.object({ body: z.object({ idToken: z.string().min(10) }) })), authController.firebaseAuth);
router.get('/auth/me', authenticate, authController.getMe);
router.put('/auth/profile', authenticate, validate(z.object({ body: z.object({ displayName: z.string().min(2).optional(), bio: z.string().optional(), avatarUrl: z.string().url().optional() }) })), authController.updateProfile);

router.get('/users', authenticate, requireRole('ADMIN'), userController.getUsers);
router.get('/users/:id', authenticate, userController.getUserById);
router.put('/users/:id/role', authenticate, requireRole('ADMIN'), userController.updateUserRole);
router.delete('/users/:id', authenticate, requireRole('ADMIN'), userController.deleteUser);

router.get('/languages', languageController.getLanguages);
router.get('/languages/:id', languageController.getLanguageById);
router.put('/languages/:id', authenticate, requireRole('ADMIN'), languageController.updateLanguage);

router.post('/executions', authenticate, validate(z.object({ body: z.object({ languageId: z.string(), stdin: z.string().optional(), files: z.array(z.object({ filename: z.string(), content: z.string() })).min(1) }) })), executionController.createExecution);
router.get('/executions/:id', authenticate, executionController.getExecutionStatus);
router.post('/executions/:id/cancel', authenticate, executionController.cancelExecution);

router.get('/problems', problemController.getProblems);
router.get('/problems/:id', problemController.getProblemById);
router.post('/problems', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), problemController.createProblem);
router.put('/problems/:id', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), problemController.updateProblem);
router.delete('/problems/:id', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), problemController.deleteProblem);

router.post('/submissions', optionalAuth, validate(z.object({ body: z.object({ problemId: z.string().uuid(), languageId: z.string(), files: z.array(z.object({ filename: z.string(), content: z.string() })).min(1) }) })), submissionController.createSubmission);
router.get('/submissions', optionalAuth, submissionController.getSubmissions);
router.get('/submissions/:id', optionalAuth, submissionController.getSubmissionById);
router.get('/users/:userId/submissions', optionalAuth, submissionController.getUserSubmissions);

router.post('/code-analysis', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string() }) })), analysisController.runCodeAnalysis);
router.get('/code-analysis/:id', optionalAuth, analysisController.getCodeAnalysis);
router.post('/ast-analysis', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string() }) })), analysisController.runAstAnalysis);
router.get('/ast-analysis/:id', optionalAuth, analysisController.getAstAnalysis);

router.post('/ast/parse', aiRateLimiter, async (req: any, res: any, next: any) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });
    const ast = await parseCode(code, language || 'python');
    res.json({ success: true, ast, language: language || 'python' });
  } catch (e) { next(e); }
});

const codePayload = z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string() }) });
router.post('/ai/review', aiRateLimiter, optionalAuth, validate(codePayload), aiController.reviewCode);
router.post('/ai/explain', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), level: z.enum(['beginner', 'intermediate', 'advanced']).optional() }) })), aiController.explainCode);
router.post('/ai/generate-tests', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ problemDescription: z.string().optional().default(''), sourceCode: z.string(), languageId: z.string() }) })), aiController.generateTests);
router.post('/ai/detect', aiRateLimiter, optionalAuth, validate(codePayload), aiController.detectAi);
router.post('/ai/shortest-code', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), expectedOutput: z.string().optional() }) })), aiController.generateShortestCode);

router.post('/ai-review/explain', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), level: z.enum(['beginner', 'intermediate', 'advanced']).optional() }) })), aiController.explainCode);
router.post('/ai-review/generate-tests', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ problemDescription: z.string().optional().default(''), sourceCode: z.string(), languageId: z.string() }) })), aiController.generateTests);
router.post('/ai-review/debug', aiRateLimiter, optionalAuth, aiController.debugCode);
router.post('/ai-review/review', aiRateLimiter, optionalAuth, validate(codePayload), aiController.reviewCode);
router.post('/ai-review/detect', aiRateLimiter, optionalAuth, validate(codePayload), aiController.detectAi);
router.post('/ai-review/shortest-code', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), expectedOutput: z.string().optional() }) })), aiController.generateShortestCode);
router.post('/ai-review/hover', aiRateLimiter, optionalAuth, aiController.explainHover);

router.post('/code-similarity', aiRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCodeA: z.string(), sourceCodeB: z.string(), languageId: z.string() }) })), aiController.compareCode);
router.get('/code-similarity/:id', optionalAuth, aiController.getSimilarityReport);

router.post('/assessments/generate-ai', optionalAuth, assessmentController.generateAiAssessment);
router.post('/assessments', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), assessmentController.createAssessment);
router.get('/assessments', optionalAuth, assessmentController.getAssessments);
router.get('/assessments/:id', optionalAuth, assessmentController.getAssessmentById);
router.post('/assessments/:id/submit', optionalAuth, assessmentController.submitAssessment);
router.get('/assessments/:id/results', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), assessmentController.getAssessmentResults);

router.get('/admin/overview', authenticate, requireRole('ADMIN'), adminController.getOverview);
router.get('/admin/stats', authenticate, requireRole('ADMIN'), adminController.getStats);
router.get('/admin/health', adminController.getHealth);
router.get('/admin/users', authenticate, requireRole('ADMIN'), adminController.getUsersList);
router.put('/admin/users/:id/role', authenticate, requireRole('ADMIN'), adminController.updateUserRole);
router.put('/admin/languages/:id', authenticate, requireRole('ADMIN'), adminController.toggleLanguage);

router.get('/leaderboard', async (_req: any, res: any, next: any) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        submissions: {
          select: {
            id: true,
            status: true,
            problemId: true,
          }
        }
      }
    });

    const leaderboard = users.map(u => {
      const totalSubmissions = u.submissions.length;
      const acceptedProblemIds = new Set(
        u.submissions.filter(s => s.status === 'ACCEPTED').map(s => s.problemId)
      );
      const problemsSolved = acceptedProblemIds.size;
      const successRate = totalSubmissions > 0 
        ? Math.round((u.submissions.filter(s => s.status === 'ACCEPTED').length / totalSubmissions) * 1000) / 10 
        : 0;
      const score = (problemsSolved * 100) + (totalSubmissions * 5);

      return {
        id: u.id,
        name: u.displayName || 'Developer',
        avatar: u.avatarUrl || undefined,
        problemsSolved,
        totalSubmissions,
        successRate,
        score
      };
    })
    .sort((a, b) => b.score - a.score || b.problemsSolved - a.problemsSolved || a.name.localeCompare(b.name))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

export default router;
