import { Router } from 'express';
import * as controller from '../../controllers/compilationControllerV1';
import { executionRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Core compilation execution (bounded & isolated)
router.post('/compilations', executionRateLimiter, controller.createCompilation);

// Compilation status & lightweight summary
router.get('/compilations/:id', controller.getCompilation);

// Full compilation execution trace
router.get('/compilations/:id/trace', controller.getCompilationTrace);

// Lazy-loaded artifact endpoints (ast, output, diagnostics)
router.get('/compilations/:id/artifacts/:type', controller.getCompilationArtifact);

// Cancellation
router.post('/compilations/:id/cancel', controller.cancelCompilation);

// Observability & Metrics
router.get('/metrics', controller.getMetrics);

export default router;
