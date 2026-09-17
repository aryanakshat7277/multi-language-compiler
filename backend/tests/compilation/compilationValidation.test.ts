import { describe, it, expect } from 'vitest';
import { CompilationOrchestrator } from '../../src/services/compilation/compilationOrchestrator';
import { CompilationError } from '../../src/domain/compilation/compilationErrors';
import { COMPILATION_LIMITS } from '../../src/config/compilationConfig';

describe('Phase 1 — Compilation Request Validation', () => {
  it('rejects empty source code with INVALID_REQUEST', async () => {
    try {
      await CompilationOrchestrator.execute({
        requestId: 'req-val-1',
        sourceCode: '',
        language: 'python'
      });
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(CompilationError);
      expect(err.errorCode).toBe('INVALID_REQUEST');
      expect(err.message).toContain('Source code is required');
    }
  });

  it('rejects missing language with INVALID_REQUEST', async () => {
    try {
      await CompilationOrchestrator.execute({
        requestId: 'req-val-2',
        sourceCode: 'print("hello")',
        language: ''
      });
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(CompilationError);
      expect(err.errorCode).toBe('INVALID_REQUEST');
      expect(err.message).toContain('language must be specified');
    }
  });

  it('rejects oversized source code with SOURCE_TOO_LARGE', async () => {
    const hugeCode = 'x = 1\n'.repeat(30000); // > 150KB
    try {
      await CompilationOrchestrator.execute({
        requestId: 'req-val-3',
        sourceCode: hugeCode,
        language: 'python'
      });
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(CompilationError);
      expect(err.errorCode).toBe('SOURCE_TOO_LARGE');
      expect(err.message).toContain('exceeds maximum limit');
    }
  });

  it('sanitizes server paths from client error serialization', () => {
    const error = new CompilationError({
      errorCode: 'INTERNAL_COMPILER_ERROR',
      message: 'Failed at C:\\Windows\\System32\\driver.sys or /app/backend/internal.ts:42',
      compilationId: 'c-test-id',
      stage: 'CODE_GENERATION',
      details: { stack: 'at /app/backend/secret.ts', internalPath: 'D:\\MULTI LANGUAGE COMPILER\\secret.env' }
    });

    const clientRes = error.toClientResponse();
    expect(clientRes.message).not.toContain('C:\\Windows');
    expect(clientRes.message).not.toContain('/app/backend');
    expect(clientRes.message).toContain('[internal-path]');
    expect(clientRes.details?.stack).toBeUndefined(); // stripped secret/stack keys
  });
});
