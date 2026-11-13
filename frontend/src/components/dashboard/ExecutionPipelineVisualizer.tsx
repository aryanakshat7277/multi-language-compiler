import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, Cpu, Shield, FileCode2, Terminal, RefreshCw, Zap } from 'lucide-react';
import './ExecutionPipelineVisualizer.css';

type SupportedLang = 'python' | 'cpp' | 'rust' | 'go';

interface StageInfo {
  id: number;
  name: string;
  shortDesc: string;
  icon: React.ReactNode;
  metricLabel: string;
  metricVal: string;
}

export default function ExecutionPipelineVisualizer() {
  const [selectedLang, setSelectedLang] = useState<SupportedLang>('python');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(-1);
  const [terminalMsg, setTerminalMsg] = useState('Engine standby: Ready for compilation dispatch');
  const [lastTotalMs, setLastTotalMs] = useState('34.8ms');

  const getStages = (lang: SupportedLang): StageInfo[] => {
    switch (lang) {
      case 'cpp':
        return [
          { id: 0, name: 'Lexer & Preprocessor', shortDesc: 'GCC 17 Parser', icon: <FileCode2 size={15} />, metricLabel: 'Tokens', metricVal: '342 Tokens' },
          { id: 1, name: 'Clang AST & IR Gen', shortDesc: 'LLVM Bitcode', icon: <Cpu size={15} />, metricLabel: 'AST Depth', metricVal: 'Depth 6 (64 Nodes)' },
          { id: 2, name: 'cgroup Sandbox', shortDesc: 'Seccomp Strict BPF', icon: <Shield size={15} />, metricLabel: 'Memory', metricVal: '256MB Max' },
          { id: 3, name: 'Binary Execution', shortDesc: 'Direct ELF Output', icon: <Terminal size={15} />, metricLabel: 'Exit Code', metricVal: '0 (38.2ms)' }
        ];
      case 'rust':
        return [
          { id: 0, name: 'Rustc Syn Tokenizer', shortDesc: 'Grammar Tree', icon: <FileCode2 size={15} />, metricLabel: 'Tokens', metricVal: '210 Tokens' },
          { id: 1, name: 'HIR / MIR Borrow Check', shortDesc: 'Zero-Cost Invariant', icon: <Cpu size={15} />, metricLabel: 'Lifetimes', metricVal: 'Safe (42 Nodes)' },
          { id: 2, name: 'Isolated Linux Jail', shortDesc: 'Namespace Sandbox', icon: <Shield size={15} />, metricLabel: 'Sandboxing', metricVal: 'Seccomp Filtered' },
          { id: 3, name: 'Target Machine Run', shortDesc: 'Host Runner Return', icon: <Terminal size={15} />, metricLabel: 'Exit Code', metricVal: '0 (31.5ms)' }
        ];
      case 'go':
        return [
          { id: 0, name: 'Go Scanner & Lexer', shortDesc: 'Syntax Tokenizer', icon: <FileCode2 size={15} />, metricLabel: 'Tokens', metricVal: '175 Tokens' },
          { id: 1, name: 'SSA Graph Compiler', shortDesc: 'Go 1.21 Toolchain', icon: <Cpu size={15} />, metricLabel: 'SSA Blocks', metricVal: '28 Basic Blocks' },
          { id: 2, name: 'Goroutine Sandbox', shortDesc: 'cgroup v2 Quota', icon: <Shield size={15} />, metricLabel: 'CPU Quota', metricVal: '2.0 vCPUs' },
          { id: 3, name: 'Native Exec Return', shortDesc: 'JSON Telemetry', icon: <Terminal size={15} />, metricLabel: 'Exit Code', metricVal: '0 (29.1ms)' }
        ];
      case 'python':
      default:
        return [
          { id: 0, name: 'Monaco AST Lexer', shortDesc: 'Bytecode Ingestion', icon: <FileCode2 size={15} />, metricLabel: 'Tokens', metricVal: '184 Tokens' },
          { id: 1, name: 'AST Syntax Tree Gen', shortDesc: 'Python 3.10 CPython', icon: <Cpu size={15} />, metricLabel: 'AST Depth', metricVal: 'Depth 4 (38 Nodes)' },
          { id: 2, name: 'Isolated Linux Sandbox', shortDesc: 'Seccomp BPF Jail', icon: <Shield size={15} />, metricLabel: 'Isolation', metricVal: '256MB cgroup' },
          { id: 3, name: 'Direct Engine Output', shortDesc: 'Sub-50ms Dispatch', icon: <Terminal size={15} />, metricLabel: 'Exit Code', metricVal: '0 (34.8ms)' }
        ];
    }
  };

  const stages = getStages(selectedLang);

  const handleSimulate = () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentStage(0);
    setTerminalMsg(`[STAGE 1/4] Tokenizing ${selectedLang.toUpperCase()} stream via AST Lexer...`);

    setTimeout(() => {
      setCurrentStage(1);
      setTerminalMsg(`[STAGE 2/4] Parsing syntax hierarchy & computing Abstract Syntax Tree...`);
    }, 700);

    setTimeout(() => {
      setCurrentStage(2);
      setTerminalMsg(`[STAGE 3/4] Spawning isolated Linux cgroup v2 sandbox with Seccomp syscall filter...`);
    }, 1400);

    setTimeout(() => {
      setCurrentStage(3);
      setTerminalMsg(`[STAGE 4/4] Execution completed: Exit Code 0, Memory 18.2MB, Time: 32.4ms.`);
      setLastTotalMs('32.4ms');
    }, 2100);

    setTimeout(() => {
      setIsRunning(false);
      setCurrentStage(-1);
      setTerminalMsg(`Engine standby: Benchmark cycle verified clean across all 4 stages.`);
    }, 3200);
  };

  return (
    <div className="pipeline-visualizer-card">
      <div className="pipeline-header">
        <div className="pipeline-title-group">
          <div className="pipeline-icon-box">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="pipeline-title">Direct Engine Execution Pipeline</h3>
            <span className="pipeline-subtitle">Sub-50ms Linux cgroup Sandbox & Abstract Syntax Tree Lifecycle</span>
          </div>
        </div>

        <div className="pipeline-controls">
          <div className="pipeline-lang-select">
            {(['python', 'cpp', 'rust', 'go'] as SupportedLang[]).map(lang => (
              <button
                key={lang}
                className={`pipeline-lang-btn ${selectedLang === lang ? 'active' : ''}`}
                onClick={() => setSelectedLang(lang)}
              >
                {lang === 'cpp' ? 'C++17' : lang.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            className="pipeline-simulate-btn"
            onClick={handleSimulate}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <RefreshCw size={13} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>Simulate Run</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Interactive Stages */}
      <div className="pipeline-stages-track">
        {stages.map((st, idx) => {
          const isActive = currentStage === idx;
          const isPassed = currentStage > idx;

          return (
            <motion.div
              key={st.id}
              className={`pipeline-stage-node ${isActive ? 'active-stage' : ''} ${isPassed ? 'passed-stage' : ''}`}
              animate={isActive ? { scale: [1, 1.02, 1] } : { scale: 1 }}
              transition={{ repeat: isActive ? Infinity : 0, duration: 0.8 }}
            >
              <div className="stage-node-header">
                <span className="stage-step-tag">STAGE 0{idx + 1}</span>
                <span className="stage-status-indicator">
                  {isActive ? 'Processing...' : isPassed ? 'Passed ✓' : 'Ready'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="stage-icon-circle">
                  {isPassed ? <CheckCircle2 size={16} /> : st.icon}
                </div>
                <div>
                  <h4 className="stage-name">{st.name}</h4>
                  <span style={{ fontSize: '11px', color: '#7A6B61' }}>{st.shortDesc}</span>
                </div>
              </div>

              <div className="stage-metric-snippet">
                <span>{st.metricLabel}:</span>
                <strong className="stage-metric-val">{st.metricVal}</strong>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Real-time telemetry log strip */}
      <div className="pipeline-terminal-bar">
        <div className="term-left">
          <span className="term-dot" />
          <span className="term-prompt">host@codeforge-sandbox:~$</span>
          <span className="term-msg">{terminalMsg}</span>
        </div>
        <div className="term-stats">
          <div className="term-stat-item">
            Runtime: <span>{lastTotalMs}</span>
          </div>
          <div className="term-stat-item">
            Isolation: <span>cgroup v2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
