import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Zap, Sparkles, Loader2, FileCode, Play, Terminal, CheckCircle2, Copy, Check, ArrowRight
} from 'lucide-react';
import { getShortestCode, ShortestCodeResult, api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { registerMonacoThemes } from '../utils/monacoThemes';
import './CodeShortenerPage.css';

const DEFAULT_ORIGINAL_CODE = `function isPrime(num) {
  if (num <= 1) return false;
  for (let i = 2; i < num; i++) {
    if (num % i === 0) return false;
  }
  return true;
}

const numbers = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const primes = [];

for (let i = 0; i < numbers.length; i++) {
  if (isPrime(numbers[i])) {
    primes.push(numbers[i]);
  }
}

console.log("Prime numbers:", primes.join(", "));`;

export default function CodeShortenerPage() {
  const [code, setCode] = useState(DEFAULT_ORIGINAL_CODE);
  const [language, setLanguage] = useState('javascript');
  const [stdinInput, setStdinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Result state
  const [result, setResult] = useState<ShortestCodeResult | null>(null);
  const [origOutput, setOrigOutput] = useState<string | null>(null);
  const [shortOutput, setShortOutput] = useState<string | null>(null);

  const { showToast } = useToast();

  const getFilename = (lang: string) => {
    if (lang === 'python') return 'main.py';
    if (lang === 'cpp') return 'main.cpp';
    if (lang === 'java') return 'Main.java';
    return 'main.js';
  };

  const handleGenerateShortest = async () => {
    setLoading(true);
    setResult(null);
    setOrigOutput(null);
    setShortOutput(null);

    const fn = getFilename(language);

    try {
      // 1. Run user's original code on backend compiler to get baseline stdout output
      const resA = await api.post('/compiler/execute', {
        language,
        files: [{ name: fn, content: code }],
        stdin: stdinInput
      });

      const stdOutA = resA?.run?.stdout || resA?.compile?.stdout || '';
      const stdErrA = resA?.run?.stderr || resA?.compile?.stderr || '';
      const finalOrigOut = (stdOutA ? stdOutA : '') + (stdErrA ? (stdOutA ? '\n' : '') + 'Errors:\n' + stdErrA : '') || '➜ Executed cleanly with no stdout';
      setOrigOutput(finalOrigOut);

      // 2. Call Gemini 2.5 Flash model API to generate the shortest code producing exact same output
      const aiRes = await getShortestCode(code, language, finalOrigOut);
      setResult(aiRes);

      // 3. Concurrently run the AI's shortest code on backend compiler to verify exact output matching!
      if (aiRes?.shortestCode) {
        api.post('/compiler/execute', {
          language,
          files: [{ name: fn, content: aiRes.shortestCode }],
          stdin: stdinInput
        }).then(resB => {
          const stdOutB = resB?.run?.stdout || resB?.compile?.stdout || '';
          const stdErrB = resB?.run?.stderr || resB?.compile?.stderr || '';
          const finalShortOut = (stdOutB ? stdOutB : '') + (stdErrB ? (stdOutB ? '\n' : '') + 'Errors:\n' + stdErrB : '') || '➜ Executed cleanly';
          setShortOutput(finalShortOut);
        }).catch(err => {
          setShortOutput(`➜ Execution error: ${err.message || 'Failed to verify shortest code'}`);
        });
      }

      showToast('Gemini 2.5 Flash shortest code generated!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error generating shortest code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShortestCode = async () => {
    if (!result?.shortestCode) return;
    try {
      await navigator.clipboard.writeText(result.shortestCode);
      setCopied(true);
      showToast('Shortest code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const outputsMatch = origOutput && shortOutput && origOutput.trim() === shortOutput.trim();

  return (
    <div className="light-shortener-page page-enter">
      {/* Top Header */}
      <div className="shortener-top-header">
        <div className="header-left">
          <div className="title-row">
            <Zap size={18} style={{ color: '#C85A32' }} />
            <h1 className="shortener-title">AI Code Golf & Shortest Code Generator</h1>
          </div>
          <span className="engine-status-subtext">Powered by Gemini 2.5 Flash Model + Host Execution Output Verification</span>
        </div>

        <div className="header-right-actions">
          <select 
            value={language} 
            onChange={e => setLanguage(e.target.value)} 
            className="shortener-lang-select"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => { setCode(DEFAULT_ORIGINAL_CODE); setResult(null); setOrigOutput(null); setShortOutput(null); }}
          >
            Reset
          </button>

          <button className="btn btn-primary btn-sm" onClick={handleGenerateShortest} disabled={loading}>
            {loading ? <Loader2 size={13} className="spin-icon" /> : <Sparkles size={13} />}
            <span>Run & Generate Shortest Code</span>
          </button>
        </div>
      </div>

      {/* Dual Editor Workspace */}
      <div className="shortener-dual-container">
        {/* Left Original Code */}
        <div className="shortener-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <FileCode size={14} style={{ color: '#B35E17' }} />
              <span className="panel-file-name">Original Code Snippet</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="bytes-badge original">{new TextEncoder().encode(code).length} Bytes</span>
              <span className="token-count-meta">{code.split('\n').length} Lines</span>
            </div>
          </div>

          <div className="panel-editor-wrap">
            <Editor
              height="100%"
              language={language}
              theme="clay-light"
              beforeMount={registerMonacoThemes}
              value={code}
              onChange={val => setCode(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 13.5, padding: { top: 10 } }}
            />
          </div>
        </div>

        {/* Right Gemini Shortest Code */}
        <div className="shortener-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <Sparkles size={14} style={{ color: '#2A5A3D' }} />
              <span className="panel-file-name">Shortest AI Code (Exact Same Output)</span>
            </div>

            {result && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="bytes-badge shortest">{result.shortestBytes} Bytes</span>
                <span className="compression-pill">-{result.reductionPercentage}% Saved</span>
                <button 
                  onClick={handleCopyShortestCode}
                  style={{ background: '#FAF4EE', border: '1px solid #C8B6A6', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#C85A32' }}
                >
                  {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="panel-editor-wrap">
            <Editor
              height="100%"
              language={language}
              theme="clay-light"
              beforeMount={registerMonacoThemes}
              value={result?.shortestCode || '// Click "Run & Generate Shortest Code" above to synthesize shortest code with Gemini 2.5 Flash'}
              options={{ minimap: { enabled: false }, fontSize: 13.5, readOnly: true, padding: { top: 10 } }}
            />
          </div>
        </div>
      </div>

      {/* Stdin Bar */}
      <div className="shortener-stdin-bar">
        <Terminal size={14} style={{ color: '#C85A32' }} />
        <span className="shortener-stdin-label">Custom Stdin (Input):</span>
        <input 
          type="text" 
          value={stdinInput} 
          onChange={e => setStdinInput(e.target.value)} 
          placeholder="Optional input passed to both programs during host execution..." 
          className="shortener-stdin-input"
        />
      </div>

      {/* Bottom Diagnostics & Output Comparison */}
      <div className="shortener-bottom-card">
        {result ? (
          <>
            {/* Compression Summary Row */}
            <div className="metrics-summary-row">
              <div className="metric-stat-box">
                <div className="stat-icon-circle">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="stat-val">{result.reductionPercentage}%</div>
                  <div className="stat-lbl">Size Reduction</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: '#8B5A2B', fontWeight: 600 }}>Original: </span>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{result.originalBytes} B</strong>
                </div>
                <ArrowRight size={16} style={{ color: '#C85A32' }} />
                <div>
                  <span style={{ fontSize: 12, color: '#2A5A3D', fontWeight: 600 }}>Shortest AI: </span>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#2A5A3D' }}>{result.shortestBytes} B</strong>
                </div>
              </div>

              {/* Verification Badge */}
              <div className={`verification-status-pill ${outputsMatch ? 'match' : 'mismatch'}`}>
                <CheckCircle2 size={15} />
                <span>{outputsMatch ? '✓ Host Outputs Match 100%' : '● Outputs Verifying...'}</span>
              </div>
            </div>

            {/* Techniques Used */}
            {result.techniquesUsed && result.techniquesUsed.length > 0 && (
              <div className="techniques-section">
                <span className="tech-title">Code Golf Techniques Applied by Gemini 2.5 Flash:</span>
                <div className="tech-pills-row">
                  {result.techniquesUsed.map((tech, idx) => (
                    <span key={idx} className="tech-pill">{tech}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation paragraph */}
            {result.explanation && (
              <div style={{ background: '#FAF4EE', border: '1px solid #E4D9CE', borderRadius: 8, padding: 12, fontSize: 13, color: '#2D231E', lineHeight: 1.55 }}>
                <strong>Optimization Insight:</strong> {result.explanation}
              </div>
            )}

            {/* Side-by-Side Console Outputs */}
            <div className="consoles-grid">
              <div className="console-box orig">
                <div className="console-title-bar title-orig">
                  <span>Original Code Output</span>
                  <span>● Baseline</span>
                </div>
                <pre className="console-output-pre">
                  {origOutput || 'Running original code...'}
                </pre>
              </div>

              <div className="console-box short">
                <div className="console-title-bar title-short">
                  <span>Shortest AI Code Output</span>
                  <span>● Verification</span>
                </div>
                <pre className="console-output-pre">
                  {shortOutput || 'Verifying shortest code output...'}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-shortener-state">
            Write or paste any code above and click <strong>Run & Generate Shortest Code</strong>. Gemini 2.5 Flash will execute your code, analyze its exact stdout, and synthesize the shortest possible program in that language!
          </div>
        )}
      </div>
    </div>
  );
}
