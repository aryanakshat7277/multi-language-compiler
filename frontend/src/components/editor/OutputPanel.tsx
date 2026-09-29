import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { 
  Terminal, Copy, Trash2, Check, AlertCircle, 
  CheckCircle2, Clock, Loader2, Sparkles, RotateCcw, 
  Play, Wrench 
} from 'lucide-react';
import { debugCode, DebugResult } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import './OutputPanel.css';

const OutputPanel: React.FC = () => {
  const {
    stdout, stderr, stdin, setStdin,
    executionTime, memoryUsed, exitCode,
    executionStatus, compileOutput, statusMessage,
    language, resetOutput, jobId, compilationMeta,
    files, activeFileId, updateFileContent,
    fixedLinesHighlight, setFixedLinesHighlight
  } = useEditorStore();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'terminal' | 'input' | 'compile' | 'pipeline' | 'diagnosis'>('terminal');
  const [copied, setCopied] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DebugResult | null>(null);
  const [originalCodeBackup, setOriginalCodeBackup] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [stdout, stderr, statusMessage, executionStatus]);

  const isRunning = executionStatus === 'submitted' || executionStatus === 'compiling' || executionStatus === 'running';

  useEffect(() => {
    if (executionStatus !== 'idle' && !isDiagnosing && activeTab !== 'diagnosis') {
      setActiveTab('terminal');
    }
  }, [executionStatus, isDiagnosing]);

  useEffect(() => {
    if (executionStatus === 'compilation_error' && compileOutput && activeTab !== 'diagnosis') {
      setActiveTab('compile');
    }
  }, [executionStatus, compileOutput]);

  // Clear decorations on fresh code run
  useEffect(() => {
    if (isRunning) {
      setFixedLinesHighlight([]);
    }
  }, [isRunning, setFixedLinesHighlight]);

  const hasError = executionStatus === 'error' || 
                   executionStatus === 'compilation_error' || 
                   (Boolean(stderr) && stderr.trim().length > 0) || 
                   (exitCode !== null && exitCode !== 0);

  const handleCopy = async () => {
    const textToCopy = stdout || stderr || '';
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDiagnoseAndFix = async () => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile || !activeFile.content.trim()) {
      showToast('No active code found in the editor to diagnose.', 'warning');
      return;
    }

    const currentCode = activeFile.content;
    const errorOutput = [
      compileOutput?.stderr || '',
      stderr || '',
      exitCode !== null && exitCode !== 0 ? `Process exited with code ${exitCode}` : '',
      stdout || ''
    ].filter(Boolean).join('\n');

    setIsDiagnosing(true);
    setOriginalCodeBackup(currentCode);

    try {
      showToast('Diagnosing error and applying automatic repair...', 'info', 'Diagnose & Fix', 2500);
      const res = await debugCode(currentCode, errorOutput, language);

      // Determine changed lines
      let changedLines: number[] = res.changedLineNumbers || [];
      if (!changedLines || changedLines.length === 0) {
        const oldLines = currentCode.split('\n');
        const newLines = (res.fix || currentCode).split('\n');
        const computed: number[] = [];
        newLines.forEach((line, idx) => {
          if (oldLines[idx] !== line) {
            computed.push(idx + 1);
          }
        });
        changedLines = computed.length > 0 ? computed : [1];
      }

      // Apply the fixed code to the editor
      if (res.fix && res.fix.trim() !== currentCode.trim()) {
        updateFileContent(activeFile.id, res.fix);
      }

      // Highlight the fixed lines in Monaco
      setFixedLinesHighlight(changedLines);

      // Save diagnosis result and switch to diagnosis tab
      setDiagnosisResult(res);
      setActiveTab('diagnosis');

      showToast(`Applied fix and highlighted ${changedLines.length} line(s) in editor.`, 'success', 'Code Repaired');
    } catch (err: any) {
      console.error('Diagnosis failed:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to diagnose and fix code.', 'error', 'Diagnosis Error');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRevert = () => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (activeFile && originalCodeBackup) {
      updateFileContent(activeFile.id, originalCodeBackup);
      setFixedLinesHighlight([]);
      showToast('Reverted editor back to your original code.', 'info', 'Reverted');
    }
  };

  const handleReRun = () => {
    const runBtn = document.querySelector('.btn-run') as HTMLButtonElement;
    if (runBtn) {
      runBtn.click();
    }
  };

  const handleJumpToLine = (lineNum: number) => {
    setFixedLinesHighlight([lineNum]);
  };

  const getShellCommand = () => {
    switch (language) {
      case 'python': return '$ python main.py';
      case 'c': return '$ gcc main.c -o main && ./main';
      case 'cpp': return '$ g++ main.cpp -o main && ./main';
      case 'java': return '$ javac Main.java && java Main';
      case 'javascript': return '$ node index.js';
      case 'typescript': return '$ node --experimental-strip-types index.ts';
      case 'go': return '$ go run main.go';
      case 'rust': return '$ rustc main.rs && ./main';
      default: return '$ ./run';
    }
  };

  // Pipeline lifecycle steps
  const getPipelineStep = () => {
    switch (executionStatus) {
      case 'submitted': return 1;
      case 'compiling': return 2;
      case 'running': return 3;
      case 'completed': return 5;
      case 'error':
      case 'compilation_error': return -1;
      default: return 0;
    }
  };

  const step = getPipelineStep();

  return (
    <div className="output-panel">
      {/* Panel Top Header Bar */}
      <div className="output-panel-header">
        <div className="output-tabs">
          <button
            className={`output-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal size={13} className="tab-icon" />
            <span>Terminal</span>
            {stderr && <span className="error-dot" />}
          </button>

          <button
            className={`output-tab-btn ${activeTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveTab('input')}
          >
            <span>Input (stdin)</span>
            {stdin && <span className="input-active-badge">●</span>}
          </button>

          <button
            className={`output-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <span>Execution Pipeline</span>
            {isRunning && <span className="pipeline-running-badge">●</span>}
          </button>

          {(hasError || diagnosisResult) && (
            <button
              className={`output-tab-btn diagnose-fix-tab-btn ${activeTab === 'diagnosis' ? 'active' : ''} ${isDiagnosing ? 'diagnosing' : ''}`}
              onClick={() => {
                if (diagnosisResult) {
                  setActiveTab('diagnosis');
                } else {
                  handleDiagnoseAndFix();
                }
              }}
              disabled={isDiagnosing}
              title="Diagnose error, automatically apply fix, highlight code changes and explain"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 size={13} className="spin-icon" />
                  <span>Diagnosing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="diagnose-icon" />
                  <span>Diagnose &amp; Fix</span>
                  {hasError && !diagnosisResult && <span className="diagnose-pulse-dot" />}
                  {diagnosisResult && <span className="diagnose-resolved-pill">Fixed</span>}
                </>
              )}
            </button>
          )}

          {compileOutput && (
            <button
              className={`output-tab-btn ${activeTab === 'compile' ? 'active' : ''}`}
              onClick={() => setActiveTab('compile')}
            >
              <span>Compiler</span>
              {executionStatus === 'compilation_error' && <span className="error-badge">Error</span>}
            </button>
          )}
        </div>

        <div className="output-actions">
          {/* Status Badge */}
          {isRunning ? (
            <div className="status-badge running">
              <Loader2 size={12} className="spin-icon" />
              <span>Executing</span>
            </div>
          ) : executionStatus === 'completed' ? (
            <div className="status-badge success">
              <CheckCircle2 size={12} />
              <span>Exit 0</span>
              {executionTime !== null && <span className="time-tag">{executionTime}ms</span>}
            </div>
          ) : executionStatus === 'error' || executionStatus === 'compilation_error' ? (
            <div className="status-badge error">
              <AlertCircle size={12} />
              <span>Exit {exitCode ?? 1}</span>
            </div>
          ) : null}

          {/* Action buttons */}
          <button 
            className="action-btn" 
            onClick={handleCopy} 
            title="Copy Output"
            disabled={!stdout && !stderr}
          >
            {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
          </button>

          <button 
            className="action-btn" 
            onClick={() => {
              resetOutput();
              setDiagnosisResult(null);
            }} 
            title="Clear Console"
            disabled={isRunning || (!stdout && !stderr && executionStatus === 'idle')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Panel Body Content */}
      <div className="output-panel-body" ref={terminalRef}>
        {activeTab === 'terminal' && (
          <div className="terminal-view">
            {executionStatus === 'idle' && !stdout && !stderr ? (
              <div className="terminal-welcome">
                <div className="welcome-icon-box">
                  <Terminal size={24} />
                </div>
                <div className="welcome-text">
                  <h4>Interactive Code Execution Console</h4>
                  <p>Click <strong>Run Code</strong> (or press <code>Ctrl+Enter</code>) to compile and execute.</p>
                </div>
              </div>
            ) : (
              <div className="terminal-log">
                {/* Shell Prompt */}
                <div className="terminal-prompt">
                  <span className="prompt-arrow">➜</span>
                  <span className="prompt-cmd">{getShellCommand()}</span>
                </div>

                {/* Loading Banner */}
                {isRunning && (
                  <div className="terminal-loading-line">
                    <Loader2 size={13} className="spin-icon" />
                    <span>{statusMessage || 'Executing code in isolated environment...'}</span>
                  </div>
                )}

                {/* Standard Output */}
                {stdout && (
                  <div className="terminal-stdout-block">
                    <pre>{stdout}</pre>
                  </div>
                )}

                {/* Standard Error */}
                {stderr && (
                  <div className="terminal-stderr-block">
                    <div className="stderr-title">
                      <AlertCircle size={13} />
                      <span>Standard Error</span>
                    </div>
                    <pre>{stderr}</pre>
                  </div>
                )}

                {/* Quick Diagnose & Fix Banner when error occurs */}
                {hasError && (
                  <div className="terminal-diagnose-card">
                    <div className="diagnose-card-left">
                      <div className="diagnose-card-icon-box">
                        <Sparkles size={16} />
                      </div>
                      <div className="diagnose-card-text">
                        <span className="diagnose-card-title">Execution encountered an error</span>
                        <span className="diagnose-card-desc">Click Diagnose &amp; Fix to auto-repair the code, highlight changed lines, and view pointwise explanations.</span>
                      </div>
                    </div>
                    <button 
                      className="diagnose-card-btn"
                      onClick={handleDiagnoseAndFix}
                      disabled={isDiagnosing}
                    >
                      {isDiagnosing ? (
                        <>
                          <Loader2 size={13} className="spin-icon" />
                          <span>Diagnosing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Diagnose &amp; Fix</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Execution Metrics Bar */}
                {!isRunning && executionStatus !== 'idle' && (
                  <div className="terminal-summary">
                    <div className={`summary-pill ${exitCode === 0 ? 'pill-success' : 'pill-error'}`}>
                      {exitCode === 0 ? '✓ Process finished successfully' : `✕ Process exited with code ${exitCode}`}
                    </div>
                    {executionTime !== null && (
                      <div className="summary-item">
                        <Clock size={12} />
                        <span>Execution time: {executionTime}ms</span>
                      </div>
                    )}
                    {memoryUsed !== null && (
                      <div className="summary-item">
                        <span>Memory: {memoryUsed.toFixed(1)}MB</span>
                      </div>
                    )}
                    {jobId && (
                      <div className="summary-item" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', opacity: 0.85 }}>
                        <span>ID: {jobId}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Diagnosis & Fix Tab View */}
        {activeTab === 'diagnosis' && (
          <div className="diagnosis-view">
            {!diagnosisResult && !isDiagnosing ? (
              <div className="diagnosis-empty">
                <Sparkles size={30} className="text-amber" />
                <h4>No Diagnosis Run Yet</h4>
                <p>Click Diagnose &amp; Fix to analyze error logs, fix bugs automatically, and highlight code changes.</p>
                <button className="btn-diagnose-primary" onClick={handleDiagnoseAndFix}>
                  <Sparkles size={14} />
                  <span>Start Diagnose &amp; Fix</span>
                </button>
              </div>
            ) : isDiagnosing ? (
              <div className="diagnosis-loading">
                <Loader2 size={32} className="spin-icon text-amber" />
                <h4>Diagnosing &amp; Synthesizing Fix...</h4>
                <p>Analyzing compiler error stack traces, identifying bug locations, and generating a validated repair...</p>
              </div>
            ) : diagnosisResult ? (
              <div className="diagnosis-content">
                {/* Top Hero Status Banner */}
                <div className="diagnosis-hero-banner">
                  <div className="hero-status">
                    <span className="hero-status-pill">
                      <CheckCircle2 size={14} />
                      <span>Fix Applied Successfully</span>
                    </span>
                    {diagnosisResult.changedLineNumbers && diagnosisResult.changedLineNumbers.length > 0 && (
                      <span className="hero-lines-pill">
                        Lines Modified: {diagnosisResult.changedLineNumbers.map(n => `L${n}`).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="hero-actions">
                    {originalCodeBackup && (
                      <button className="diagnosis-sub-btn" onClick={handleRevert} title="Revert to code before fix was applied">
                        <RotateCcw size={13} />
                        <span>Revert Changes</span>
                      </button>
                    )}
                    <button className="diagnosis-sub-btn re-run" onClick={handleReRun} title="Run repaired code">
                      <Play size={13} />
                      <span>Run Fixed Code</span>
                    </button>
                    <button className="diagnosis-sub-btn" onClick={handleDiagnoseAndFix} title="Re-run diagnosis">
                      <Sparkles size={13} />
                      <span>Re-diagnose</span>
                    </button>
                  </div>
                </div>

                {/* Section 1: Error Diagnosis (Pointwise) */}
                <div className="diagnosis-section-card error-card">
                  <div className="card-header-row">
                    <div className="header-title-box">
                      <AlertCircle size={15} className="text-error" />
                      <h5>1. Error Diagnosis &amp; Root Cause (Pointwise)</h5>
                    </div>
                    <span className="card-badge-error">Issue Detected</span>
                  </div>
                  <p className="card-summary-line">{diagnosisResult.rootCause}</p>
                  <ul className="pointwise-list">
                    {(diagnosisResult.errorPoints && diagnosisResult.errorPoints.length > 0
                      ? diagnosisResult.errorPoints
                      : [diagnosisResult.rootCause]
                    ).map((point, i) => (
                      <li key={i} className="pointwise-item">
                        <span className="item-bullet-num error">{i + 1}</span>
                        <span className="pointwise-text">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 2: How It Was Fixed (Pointwise) */}
                <div className="diagnosis-section-card fix-card">
                  <div className="card-header-row">
                    <div className="header-title-box">
                      <CheckCircle2 size={15} className="text-forest" />
                      <h5>2. How The Error Was Fixed (Pointwise)</h5>
                    </div>
                    <span className="card-badge-success">Resolved</span>
                  </div>
                  <ul className="pointwise-list">
                    {(diagnosisResult.fixPoints && diagnosisResult.fixPoints.length > 0
                      ? diagnosisResult.fixPoints
                      : diagnosisResult.hints || ['Syntax and execution constraints resolved.']
                    ).map((point, i) => (
                      <li key={i} className="pointwise-item">
                        <span className="item-bullet-num success">{i + 1}</span>
                        <span className="pointwise-text">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: Exact Changes Made (Pointwise) */}
                <div className="diagnosis-section-card changes-card">
                  <div className="card-header-row">
                    <div className="header-title-box">
                      <Wrench size={15} className="text-amber" />
                      <h5>3. What Changes Were Made to Your Code (Pointwise)</h5>
                    </div>
                    <span className="card-badge-amber">Editor Updated</span>
                  </div>
                  <ul className="pointwise-list">
                    {(diagnosisResult.changesMade && diagnosisResult.changesMade.length > 0
                      ? diagnosisResult.changesMade
                      : ['Applied corrective syntax updates to editor file.']
                    ).map((point, i) => (
                      <li key={i} className="pointwise-item">
                        <span className="item-bullet-num amber">{i + 1}</span>
                        <span className="pointwise-text">{point}</span>
                      </li>
                    ))}
                  </ul>

                  {diagnosisResult.changedLineNumbers && diagnosisResult.changedLineNumbers.length > 0 && (
                    <div className="highlighted-lines-note">
                      <span>Highlighted in Code Editor:</span>
                      <div className="line-tags-container">
                        {diagnosisResult.changedLineNumbers.map((lineNum) => (
                          <button 
                            key={lineNum} 
                            className="line-tag-btn"
                            onClick={() => handleJumpToLine(lineNum)}
                            title={`Click to focus on line ${lineNum}`}
                          >
                            Line {lineNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Execution Lifecycle Timeline */}
        {activeTab === 'pipeline' && (
          <div className="pipeline-view">
            <div className="pipeline-title">Execution Lifecycle Timeline</div>
            <div className="pipeline-steps">
              <div className={`pipe-step ${step >= 1 ? 'done' : ''} ${step === 1 ? 'active' : ''}`}>
                <div className="step-node">1</div>
                <div className="step-label">QUEUED</div>
              </div>
              <div className="pipe-line" />
              <div className={`pipe-step ${step >= 2 ? 'done' : ''} ${step === 2 ? 'active' : ''}`}>
                <div className="step-node">2</div>
                <div className="step-label">PARSER</div>
              </div>
              <div className="pipe-line" />
              <div className={`pipe-step ${step >= 3 ? 'done' : ''} ${step === 3 ? 'active' : ''}`}>
                <div className="step-node">3</div>
                <div className="step-label">EXECUTION</div>
              </div>
              <div className="pipe-line" />
              <div className={`pipe-step ${step >= 5 ? 'done' : step === -1 ? 'error' : ''}`}>
                <div className="step-node">{step === -1 ? '✕' : '4'}</div>
                <div className="step-label">{step === -1 ? 'ERROR' : 'COMPLETED'}</div>
              </div>
            </div>
            <div className="pipeline-details">
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span>Compilation ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{jobId || compilationMeta?.compilationId || 'c-idle'}</strong></span>
                <span>Status: <strong>{executionStatus === 'completed' ? 'SUCCEEDED' : executionStatus.toUpperCase()}</strong></span>
                <span>Stage: <strong>{compilationMeta?.stage || (isRunning ? 'CODE_GENERATION' : 'READY')}</strong></span>
                {executionTime !== null && <span>Duration: <strong>{executionTime}ms</strong></span>}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <span>Worker Pool: <strong>Bounded Semaphore (2,000 max queue)</strong></span>
                {memoryUsed !== null && <span>Peak Memory: <strong>{memoryUsed.toFixed(1)} MB</strong></span>}
                <span>Engine: <strong>Local Direct Sandbox</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Input (stdin) Tab */}
        {activeTab === 'input' && (
          <div className="stdin-view">
            <div className="stdin-toolbar">
              <span className="stdin-hint">Standard input passed to program via stdin (e.g. input() / cin / readline):</span>
              <div className="stdin-presets">
                <button 
                  type="button" 
                  className="preset-btn"
                  onClick={() => setStdin('42\n')}
                >
                  Number (42)
                </button>
                <button 
                  type="button" 
                  className="preset-btn"
                  onClick={() => setStdin('Alice\nBob\nCharlie\n')}
                >
                  Multi-line Names
                </button>
                <button 
                  type="button" 
                  className="preset-btn"
                  onClick={() => setStdin('5\n10 20 30 40 50\n')}
                >
                  Array Input
                </button>
                <button 
                  type="button" 
                  className="preset-btn clear-btn"
                  onClick={() => setStdin('')}
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              className="stdin-textarea"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter standard input here...&#10;Line 1&#10;Line 2"
              disabled={isRunning}
              spellCheck={false}
            />
          </div>
        )}

        {/* Compiler Tab */}
        {activeTab === 'compile' && compileOutput && (
          <div className="compile-view">
            <div className="compile-header">
              <span className={compileOutput.code === 0 ? 'compile-badge success' : 'compile-badge error'}>
                Compiler Status: {compileOutput.code === 0 ? 'Success' : `Exit Code ${compileOutput.code}`}
              </span>
            </div>
            {compileOutput.stderr ? (
              <div className="terminal-stderr-block">
                <pre>{compileOutput.stderr}</pre>
              </div>
            ) : (
              <div className="terminal-stdout-block">
                <pre>{compileOutput.stdout || 'Compilation completed without warnings.'}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
