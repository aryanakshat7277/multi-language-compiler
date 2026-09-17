import { describe, it, expect } from 'vitest';
import { CompilationOrchestrator } from '../../src/services/compilation/compilationOrchestrator';

describe('Phase 1 — Concurrency & Multi-Tenant State Isolation', () => {
  it('handles 20 concurrent distinct compilations with zero state contamination and unique IDs', async () => {
    const concurrentCount = 20;
    const promises = Array.from({ length: concurrentCount }, (_, i) => {
      const uniqueTag = `USER_TOKEN_${i}_${Date.now()}`;
      return CompilationOrchestrator.execute({
        requestId: `req-concurrency-${i}`,
        sourceCode: `tag = "${uniqueTag}"\nprint(f"ECHO:{tag}")`,
        language: 'python'
      }).then(res => ({ index: i, expectedTag: uniqueTag, result: res }));
    });

    const results = await Promise.all(promises);

    // 1. Verify all 20 succeeded
    expect(results).toHaveLength(concurrentCount);
    for (const item of results) {
      expect(item.result.status).toBe('SUCCEEDED');
      // 2. Verify that output corresponds EXACTLY to this user's input (zero cross-user mixing!)
      expect(item.result.output?.stdout).toContain(`ECHO:${item.expectedTag}`);
    }

    // 3. Verify all compilation IDs are 100% distinct (zero collisions)
    const compilationIds = results.map(r => r.result.compilationId);
    const uniqueIds = new Set(compilationIds);
    expect(uniqueIds.size).toBe(concurrentCount);

    // 4. Verify all request IDs match caller request IDs
    for (let i = 0; i < concurrentCount; i++) {
      expect(results[i].result.requestId).toBe(`req-concurrency-${i}`);
    }
  }, 45000); // Allow up to 45s for 20 executions on local CPU
});
