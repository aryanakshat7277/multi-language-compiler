import { describe, it, expect } from 'vitest';
import { CompilationOrchestrator } from '../../src/services/compilation/compilationOrchestrator';

describe('Phase 1 — Compilation Execution & Lifecycle', () => {
  it('executes valid Python code and produces structured result with stages and trace', async () => {
    const result = await CompilationOrchestrator.execute({
      requestId: 'req-lifecycle-1',
      sourceCode: 'print("Phase 1 Architecture Alive")',
      language: 'python'
    });

    expect(result.status).toBe('SUCCEEDED');
    expect(result.compilationId).toMatch(/^c-/);
    expect(result.output?.stdout).toContain('Phase 1 Architecture Alive');
    expect(result.durationMs).toBeGreaterThan(0);

    // Verify stages were recorded
    const stageTypes = result.stages.map(s => s.stageType);
    expect(stageTypes).toContain('SOURCE');
    expect(stageTypes).toContain('PARSER');
    expect(stageTypes).toContain('CODE_GENERATION');

    // Verify lazy-load artifact retrieval
    const ast = CompilationOrchestrator.getArtifact(result.compilationId, 'ast');
    expect(ast).not.toBeNull();
    expect(ast.type || ast.name).toBeTruthy();

    const output = CompilationOrchestrator.getArtifact(result.compilationId, 'output');
    expect(output?.stdout).toContain('Phase 1 Architecture Alive');
  }, 15000);

  it('blocks dangerous fork-bomb scripts with RESOURCE_LIMIT and security diagnostic', async () => {
    const result = await CompilationOrchestrator.execute({
      requestId: 'req-sec-1',
      sourceCode: 'import os\nwhile True: os.fork()',
      language: 'python'
    });

    expect(result.status).toBe('RESOURCE_LIMIT');
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].code).toBe('SEC_ERR_01');
    expect(result.output?.stderr).toContain('Security sandbox blocked');
  });

  it('handles cancellation gracefully', async () => {
    // Attempt cancellation of non-existent job
    const nonExistentCancel = CompilationOrchestrator.cancelCompilation('c-non-existent-id');
    expect(nonExistentCancel).toBe(false);
  });
});
