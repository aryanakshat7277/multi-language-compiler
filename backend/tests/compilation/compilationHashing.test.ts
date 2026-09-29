import { describe, it, expect, beforeEach } from 'vitest';
import { CompilationCache } from '../../src/services/compilation/compilationCache';
import { CompilationRequest, CompilationResult } from '../../src/domain/compilation/compilationTypes';

describe('Phase 1 — Deterministic Hashing & Bounded Caching', () => {
  beforeEach(() => {
    CompilationCache.clear();
  });

  const baseReq: CompilationRequest = {
    requestId: 'req-hash-1',
    sourceCode: 'print("Deterministic Test")',
    language: 'python',
    compilerVersion: '3.11',
    optimizationLevel: 'O2',
    target: 'x86_64'
  };

  it('generates identical hash for identical compilation inputs', () => {
    const hash1 = CompilationCache.generateSourceHash(baseReq);
    const hash2 = CompilationCache.generateSourceHash({ ...baseReq, requestId: 'different-req-id' });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it('generates different hashes when compilation inputs vary', () => {
    const hashOriginal = CompilationCache.generateSourceHash(baseReq);
    const hashDifferentCode = CompilationCache.generateSourceHash({ ...baseReq, sourceCode: 'print("Different")' });
    const hashDifferentLang = CompilationCache.generateSourceHash({ ...baseReq, language: 'typescript' });
    const hashDifferentOpt = CompilationCache.generateSourceHash({ ...baseReq, optimizationLevel: 'O0' });

    expect(hashOriginal).not.toBe(hashDifferentCode);
    expect(hashOriginal).not.toBe(hashDifferentLang);
    expect(hashOriginal).not.toBe(hashDifferentOpt);
  });

  it('stores and retrieves cached results, updating hit metrics', () => {
    const hash = CompilationCache.generateSourceHash(baseReq);
    expect(CompilationCache.get(hash)).toBeNull();

    const mockResult: CompilationResult = {
      compilationId: 'c-cached-1',
      requestId: 'req-1',
      status: 'SUCCEEDED',
      sourceHash: hash,
      language: 'python',
      compilerVersion: '1.0.0',
      durationMs: 45,
      stages: [],
      diagnostics: [],
      statistics: {
        totalDurationMs: 45,
        sourceSizeBytes: 100,
        linesOfCode: 5,
        peakMemoryMb: 50,
        stageDurationsMs: {}
      },
      traceMetadata: {
        applicationVersion: '1.0.0',
        compilerVersion: '1.0.0',
        target: 'native',
        optimizationLevel: 'O2',
        createdAt: new Date().toISOString()
      }
    };

    CompilationCache.set(hash, mockResult);

    const retrieved = CompilationCache.get(hash);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.compilationId).toBe('c-cached-1');

    const stats = CompilationCache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
  });

  it('does NOT cache failed compilations', () => {
    const hash = CompilationCache.generateSourceHash(baseReq);
    const mockFailedResult: any = {
      compilationId: 'c-failed',
      status: 'FAILED'
    };

    CompilationCache.set(hash, mockFailedResult);
    expect(CompilationCache.get(hash)).toBeNull();
  });
});
