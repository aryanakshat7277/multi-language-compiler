import { describe, it, expect } from 'vitest';
import { CompilationContext } from '../../src/services/compilation/compilationContext';
import { CompilationRequest } from '../../src/domain/compilation/compilationTypes';

describe('Phase 1 — Thread-Safe Compilation Context', () => {
  const req: CompilationRequest = {
    requestId: 'req-ctx-1',
    sourceCode: 'const a = 1;\nconst b = 2;\nconsole.log(a + b);',
    language: 'javascript'
  };

  it('generates unique compilation IDs with c- prefix', () => {
    const ctx1 = new CompilationContext(req);
    const ctx2 = new CompilationContext(req);
    expect(ctx1.compilationId).toMatch(/^c-[a-f0-9-]+$/);
    expect(ctx2.compilationId).toMatch(/^c-[a-f0-9-]+$/);
    expect(ctx1.compilationId).not.toBe(ctx2.compilationId);
  });

  it('generates isolated, collision-free stable artifact IDs', () => {
    const ctx1 = new CompilationContext(req);
    const ctx2 = new CompilationContext(req);

    const id1_a = ctx1.generateArtifactId('ast');
    const id1_b = ctx1.generateArtifactId('ast');
    const id2_a = ctx2.generateArtifactId('ast');

    expect(id1_a).not.toBe(id1_b);
    expect(id1_a).not.toBe(id2_a);
    expect(id1_a).toContain('ast-');
  });

  it('tracks stages, stage status, and duration accurately', async () => {
    const ctx = new CompilationContext(req);
    const stageId = ctx.startStage('PARSER', 'source-snapshot');

    // Simulate 20ms stage duration
    await new Promise(r => setTimeout(r, 20));

    ctx.completeStage(stageId, 'ast-tree-v1', { nodes: 15 });

    const stages = ctx.getStages();
    expect(stages).toHaveLength(1);
    expect(stages[0].stageType).toBe('PARSER');
    expect(stages[0].status).toBe('COMPLETED');
    expect(stages[0].durationMs).toBeGreaterThanOrEqual(15);
    expect(stages[0].metadata?.nodes).toBe(15);
  });

  it('collects diagnostics and converts to a complete CompilationTrace', () => {
    const ctx = new CompilationContext(req);
    ctx.addDiagnostic({
      severity: 'warning',
      message: 'Unused variable',
      stage: 'SEMANTIC',
      range: { startLine: 1, startColumn: 7, endLine: 1, endColumn: 8 },
      code: 'W01'
    });

    const trace = ctx.toTrace(req.sourceCode, 'dummy-hash', 50);
    expect(trace.compilationId).toBe(ctx.compilationId);
    expect(trace.diagnostics).toHaveLength(1);
    expect(trace.diagnostics[0].severity).toBe('warning');
    expect(trace.statistics.linesOfCode).toBe(3);
  });
});
