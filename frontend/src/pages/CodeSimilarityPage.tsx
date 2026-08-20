import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  GitCompare, Sparkles, Loader2, FileCode, Play, Terminal
} from 'lucide-react';
import { getCodeSimilarity, SimilarityResult, api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { registerMonacoThemes } from '../utils/monacoThemes';
import './CodeSimilarityPage.css';

const SNIPPET_A = `// Program A: Target Solution
function calculatePrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}
console.log("Is 29 prime?", calculatePrime(29));
console.log("Is 100 prime?", calculatePrime(100));`;

const SNIPPET_B = `// Program B: Reference / Other Solution
function isPrimeNumber(val) {
  if (val < 2) return false;
  let d = 2;
  while (d * d <= val) {
    if (val % d === 0) return false;
    d++;
  }
  return true;
}
console.log("Is 29 prime?", isPrimeNumber(29));
console.log("Is 100 prime?", isPrimeNumber(100));`;

export default function CodeSimilarityPage() {
  const [codeA, setCodeA] = useState(SNIPPET_A);
  const [codeB, setCodeB] = useState(SNIPPET_B);
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimilarityResult | null>(null);

  // Execution Outputs for Program A & B
  const [outputA, setOutputA] = useState<string | null>(null);
  const [outputB, setOutputB] = useState<string | null>(null);
  const [stdinInput, setStdinInput] = useState<string>('');

  const { showToast } = useToast();

  const formatExplanation = (text?: string) => {
    if (!text) return '';
    return text
      .replace(/\$O\(\\sqrt\{N\}\)\$/g, 'O(√N)')
      .replace(/\$O\(\\sqrt\{n\}\)\$/g, 'O(√n)')
      .replace(/\$O\(N\)\$/g, 'O(N)')
      .replace(/\$O\(1\)\$/g, 'O(1)')
      .replace(/\$/g, '');
  };

  const getFilename = (lang: string) => {
    if (lang === 'python') return 'main.py';
    if (lang === 'cpp') return 'main.cpp';
    if (lang === 'java') return 'Main.java';
    return 'main.js';
  };

  const handleCompareAndRun = async () => {
    setLoading(true);
    try {
      // 1. Instantly get real Gemini 2.5 Flash Code Similarity
      const simRes = await getCodeSimilarity(codeA, codeB, language);
      if (simRes) {
        setResult(simRes);
        showToast('Gemini AI Code DNA Comparison complete!', 'success');
      }

      // 2. Concurrently execute Program A and B in background
      const fn = getFilename(language);
      api.post('/compiler/execute', {
        language,
        files: [{ name: fn, content: codeA }],
        stdin: stdinInput
      }).then(resA => {
        const outA = resA?.run?.stdout || resA?.compile?.stdout || '';
        const errA = resA?.run?.stderr || resA?.compile?.stderr || '';
        setOutputA((outA ? outA : '') + (errA ? (outA ? '\n' : '') + 'Errors:\n' + errA : '') || '➜ Program A executed cleanly');
      }).catch(e => {
        setOutputA(`➜ Execution error: ${e.message || 'Error running Program A'}`);
      });

      api.post('/compiler/execute', {
        language,
        files: [{ name: fn, content: codeB }],
        stdin: stdinInput
      }).then(resB => {
        const outB = resB?.run?.stdout || resB?.compile?.stdout || '';
        const errB = resB?.run?.stderr || resB?.compile?.stderr || '';
        setOutputB((outB ? outB : '') + (errB ? (outB ? '\n' : '') + 'Errors:\n' + errB : '') || '➜ Program B executed cleanly');
      }).catch(e => {
        setOutputB(`➜ Execution error: ${e.message || 'Error running Program B'}`);
      });

    } catch (e: any) {
      showToast(e.message || 'Error computing similarity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const overallScorePct = result ? Math.round(result.overallScore * 100) : 0;
  const isHighRisk = result ? result.overallScore >= 0.75 : false;

  return (
    <div className="light-similarity-page page-enter">
      {/* Top Header */}
      <div className="similarity-top-header">
        <div className="header-left">
          <div className="title-row">
            <GitCompare size={16} style={{ color: '#C85A32' }} />
            <h1 className="similarity-title">Code DNA & Similarity Comparator</h1>
          </div>
          <span className="engine-status-subtext">AST & Control Flow Graph Structure Comparator + Dual Host Runtime Execution</span>
        </div>

        <div className="header-right-actions">
          <select 
            value={language} 
            onChange={e => setLanguage(e.target.value)} 
            className="sim-lang-select"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={() => { setCodeA(SNIPPET_A); setCodeB(SNIPPET_B); setResult(null); setOutputA(null); setOutputB(null); }}>
            Reset
          </button>

          <button className="btn btn-primary btn-sm" onClick={handleCompareAndRun} disabled={loading}>
            {loading ? <Loader2 size={13} className="spin-icon" /> : <Play size={13} />}
            <span>Run Both & Compare DNA</span>
          </button>
        </div>
      </div>

      {/* Main Dual Program Split */}
      <div className="similarity-dual-container">
        {/* Left Program A */}
        <div className="program-panel left-program">
          <div className="program-header">
            <div className="program-title-wrap">
              <FileCode size={14} style={{ color: '#C85A32' }} />
              <span className="file-name">Program A — Target Code</span>
            </div>
            <span className="token-count-meta">{codeA.split('\n').length} Lines</span>
          </div>

          <div className="program-editor-wrap">
            <Editor
              height="100%"
              language={language}
              theme="clay-light"
              beforeMount={registerMonacoThemes}
              value={codeA}
              onChange={(val) => setCodeA(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13.5, padding: { top: 10 } }}
            />
          </div>
        </div>

        {/* Right Program B */}
        <div className="program-panel right-program">
          <div className="program-header">
            <div className="program-title-wrap">
              <FileCode size={14} style={{ color: '#2A5A3D' }} />
              <span className="file-name">Program B — Reference / Other Solution</span>
            </div>
            <span className="token-count-meta">{codeB.split('\n').length} Lines</span>
          </div>

          <div className="program-editor-wrap">
            <Editor
              height="100%"
              language={language}
              theme="clay-light"
              beforeMount={registerMonacoThemes}
              value={codeB}
              onChange={(val) => setCodeB(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13.5, padding: { top: 10 } }}
            />
          </div>
        </div>
      </div>

      {/* Stdin Option Bar */}
      <div className="sim-stdin-bar">
        <Terminal size={14} style={{ color: '#C85A32' }} />
        <span className="sim-stdin-label">Custom Stdin (Input):</span>
        <input 
          type="text" 
          value={stdinInput} 
          onChange={e => setStdinInput(e.target.value)} 
          placeholder="Optional input passed to both programs..." 
          className="sim-stdin-input"
        />
      </div>

      {/* Bottom Diagnostics & Live Outputs */}
      <div className="similarity-bottom-stats-card">
        {result ? (
          <>
            <div className="stats-top-row">
              <div className="stats-score-left">
                <div className={`score-badge-circle ${isHighRisk ? 'high-risk' : 'low-risk'}`}>
                  <span className="score-huge">{overallScorePct}%</span>
                  <span className="score-label">MATCH</span>
                </div>
                <div className="verdict-summary">
                  <h4 style={{ color: isHighRisk ? '#C85A32' : '#2A5A3D' }}>
                    {isHighRisk ? '⚠️ High Structural Similarity / Plagiarism Risk' : '✓ Low Similarity / Distinct Implementations'}
                  </h4>
                  <p className="verdict-explanation">
                    {formatExplanation(result.explanation) || (isHighRisk 
                    ? 'The structural signatures are highly similar, indicating identical algorithmic logic.'
                    : 'Both programs exhibit distinct structures with divergent logic.')}
                  </p>
                </div>
              </div>

              <div className="stats-bars-right">
                <div className="dna-bar-item">
                  <div className="bar-label-row">
                    <span>Lexical Similarity</span>
                    <strong>{Math.round(result.lexicalScore * 100)}%</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill amber-fill" style={{ width: `${Math.round(result.lexicalScore * 100)}%` }} />
                  </div>
                </div>

                <div className="dna-bar-item">
                  <div className="bar-label-row">
                    <span>Control Flow & Structural Score</span>
                    <strong>{Math.round(result.structuralScore * 100)}%</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill terracotta-fill" style={{ width: `${Math.round(result.structuralScore * 100)}%` }} />
                  </div>
                </div>

                <div className="dna-bar-item">
                  <div className="bar-label-row">
                    <span>AST Isomorphism Score</span>
                    <strong>{Math.round(result.astScore * 100)}%</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill forest-fill" style={{ width: `${Math.round(result.astScore * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE PROGRAM OUTPUT CONSOLES */}
            <div className="consoles-container">
              <div className="consoles-header">
                <Terminal size={14} style={{ color: '#C85A32' }} />
                <span>Live Host Execution Outputs (Stdout / Stderr)</span>
              </div>

              <div className="consoles-grid">
                {/* Console A */}
                <div className="console-box console-a">
                  <div className="console-box-title title-a">
                    <span>Program A Console Output</span>
                    <span className="live-status">● Live</span>
                  </div>
                  <pre className="console-pre">
                    {outputA || 'Click "Run Both & Compare DNA" to execute Program A'}
                  </pre>
                </div>

                {/* Console B */}
                <div className="console-box console-b">
                  <div className="console-box-title title-b">
                    <span>Program B Console Output</span>
                    <span className="live-status">● Live</span>
                  </div>
                  <pre className="console-pre">
                    {outputB || 'Click "Run Both & Compare DNA" to execute Program B'}
                  </pre>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-sim-state">
            Click <strong>Run Both & Compare DNA</strong> above to execute Program A & Program B on host runtimes and compare their structural signatures!
          </div>
        )}
      </div>
    </div>
  );
}
