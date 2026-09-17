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
import { parseCode } from '../services/astService';
import { LocalExecutorService } from '../services/localExecutorService';
import { executionRateLimiter, authRateLimiter, analysisRateLimiter } from '../middleware/rateLimiter';
import v1CompilationRoutes from './v1/compilationRoutes';
import * as compilationControllerV1 from '../controllers/compilationControllerV1';
import * as os from 'os';

const router = Router();

// Phase 1 Architecture: Liveness & Readiness Probes
router.get('/health/live', compilationControllerV1.getLiveness);
router.get('/health/ready', compilationControllerV1.getReadiness);

// Phase 1 Unified Compilation Architecture (v1)
router.use('/v1', v1CompilationRoutes);

// Production System Telemetry & Health Monitoring
router.get('/health/telemetry', (req, res) => {
  const memory = process.memoryUsage();
  const pool = LocalExecutorService.getPoolMetrics();
  res.json({
    status: 'HEALTHY',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      cpuCores: os.cpus().length,
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024))
    },
    process: {
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      rssMb: Math.round(memory.rss / (1024 * 1024))
    },
    compilerWorkerPool: pool
  });
});

router.get('/compiler/health', compilerController.healthCheck);
router.get('/compiler/languages', compilerController.getLanguages);
router.post('/compiler/execute', executionRateLimiter, optionalAuth, compilerController.executeCode);
router.get('/compiler/executions/:id', optionalAuth, compilerController.getExecution);
router.get('/compiler/executions/:id/events', optionalAuth, compilerController.getExecutionEvents);

router.post('/auth/register', authRateLimiter, validate(z.object({ body: z.object({ email: z.string().email(), password: z.string().min(6), displayName: z.string().min(2) }) })), authController.register);
router.post('/auth/login', authRateLimiter, validate(z.object({ body: z.object({ email: z.string().email(), password: z.string() }) })), authController.login);
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
router.get('/submissions/:id', optionalAuth, submissionController.getSubmissionById);
router.get('/users/:userId/submissions', optionalAuth, submissionController.getUserSubmissions);

router.post('/code-analysis', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string() }) })), analysisController.runCodeAnalysis);
router.get('/code-analysis/:id', optionalAuth, analysisController.getCodeAnalysis);
router.post('/ast-analysis', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string() }) })), analysisController.runAstAnalysis);
router.get('/ast-analysis/:id', optionalAuth, analysisController.getAstAnalysis);

router.post('/ast/parse', analysisRateLimiter, async (req: any, res: any, next: any) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });
    const ast = await parseCode(code, language || 'python');
    res.json({ success: true, ast, language: language || 'python' });
  } catch (e) { next(e); }
});

const codePayload = z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string() }) });
router.post('/ai/review', analysisRateLimiter, optionalAuth, validate(codePayload), aiController.reviewCode);
router.post('/ai/explain', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), level: z.enum(['beginner', 'intermediate', 'advanced']).optional() }) })), aiController.explainCode);
router.post('/ai/generate-tests', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ problemDescription: z.string().optional().default(''), sourceCode: z.string(), languageId: z.string() }) })), aiController.generateTests);
router.post('/ai/detect', analysisRateLimiter, optionalAuth, validate(codePayload), aiController.detectAi);
router.post('/ai/shortest-code', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), expectedOutput: z.string().optional() }) })), aiController.generateShortestCode);

router.post('/ai-review/explain', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), level: z.enum(['beginner', 'intermediate', 'advanced']).optional() }) })), aiController.explainCode);
router.post('/ai-review/generate-tests', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ problemDescription: z.string().optional().default(''), sourceCode: z.string(), languageId: z.string() }) })), aiController.generateTests);
router.post('/ai-review/debug', analysisRateLimiter, optionalAuth, aiController.debugCode);
router.post('/ai-review/review', analysisRateLimiter, optionalAuth, validate(codePayload), aiController.reviewCode);
router.post('/ai-review/detect', analysisRateLimiter, optionalAuth, validate(codePayload), aiController.detectAi);
router.post('/ai-review/shortest-code', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCode: z.string(), languageId: z.string(), expectedOutput: z.string().optional() }) })), aiController.generateShortestCode);
router.post('/ai-review/hover', analysisRateLimiter, optionalAuth, aiController.explainHover);

router.post('/code-similarity', analysisRateLimiter, optionalAuth, validate(z.object({ body: z.object({ sourceCodeA: z.string(), sourceCodeB: z.string(), languageId: z.string() }) })), aiController.compareCode);
router.get('/code-similarity/:id', optionalAuth, aiController.getSimilarityReport);

router.post('/assessments/generate-ai', optionalAuth, assessmentController.generateAiAssessment);
router.post('/assessments', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), assessmentController.createAssessment);
router.get('/assessments', optionalAuth, assessmentController.getAssessments);
router.get('/assessments/:id', optionalAuth, assessmentController.getAssessmentById);
router.post('/assessments/:id/submit', optionalAuth, assessmentController.submitAssessment);
router.get('/assessments/:id/results', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), assessmentController.getAssessmentResults);

router.get('/users', async (req: any, res: any) => {
  res.json([
    { id: 'u1', displayName: 'AKSHAT ARYAN', email: 'akshat.aryan@codeforge.io', role: 'LEAD ARCHITECT', _count: { submissions: 243 } },
    { id: 'u2', displayName: 'WARISH KHAN', email: 'warish.khan@codeforge.io', role: 'CORE CONTRIBUTOR', _count: { submissions: 215 } },
    { id: 'u3', displayName: 'ARUN DEV', email: 'arun.dev@codeforge.io', role: 'COMPILER SPECIALIST', _count: { submissions: 198 } },
    { id: 'u4', displayName: 'MOHIT', email: 'mohit@codeforge.io', role: 'AI ENGINE SPECIALIST', _count: { submissions: 184 } },
    { id: 'u5', displayName: 'AQUIB', email: 'aquib@codeforge.io', role: 'SECURITY LEAD', _count: { submissions: 172 } },
    { id: 'u6', displayName: 'ABHAY', email: 'abhay@codeforge.io', role: 'PERFORMANCE ENGINEER', _count: { submissions: 165 } }
  ]);
});

export default router;
