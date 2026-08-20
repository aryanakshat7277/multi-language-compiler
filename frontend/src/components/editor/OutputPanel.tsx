import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { Terminal, Copy, Trash2, Check, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import './OutputPanel.css';

const OutputPanel: React.FC = () => {
  const {
    stdout, stderr, stdin, setStdin,
    executionTime, memoryUsed, exitCode,
    executionStatus, compileOutput, statusMessage,
    language, resetOutput
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'terminal' | 'input' | 'compile' | 'pipeline'>('terminal');
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [stdout, stderr, statusMessage, executionStatus]);

  useEffect(() => {
    if (executionStatus !== 'idle') {
      setActiveTab('terminal');
    }
  }, [executionStatus]);

  useEffect(() => {
    if (executionStatus === 'compilation_error' && compileOutput) {
      setActiveTab('compile');
    }
  }, [executionStatus, compileOutput]);

  const isRunning = executionStatus === 'submitted' || executionStatus === 'compiling' || executionStatus === 'running';

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
            onClick={resetOutput} 
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
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                <div className="step-label">COMPILING</div>
              </div>
              <div className="pipe-line" />
              <div className={`pipe-step ${step >= 3 ? 'done' : ''} ${step === 3 ? 'active' : ''}`}>
                <div className="step-node">3</div>
                <div className="step-label">RUNNING</div>
              </div>
              <div className="pipe-line" />
              <div className={`pipe-step ${step >= 5 ? 'done' : step === -1 ? 'error' : ''}`}>
                <div className="step-node">{step === -1 ? '✕' : '4'}</div>
                <div className="step-label">{step === -1 ? 'ERROR' : 'COMPLETED'}</div>
              </div>
            </div>
            <div className="pipeline-details">
              Status: <strong>{executionStatus.toUpperCase()}</strong> • Engine: <strong>Local Direct Sandbox</strong>
            </div>
          </div>
        )}

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
