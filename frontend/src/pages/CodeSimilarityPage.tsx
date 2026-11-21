import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  GitCompare, Sparkles, Loader2, FileCode, Play, Terminal, AlertTriangle, CheckCircle2,
  Info, Wrench
} from 'lucide-react';
import { getCodeSimilarity, validateCodeCorrectness, SimilarityResult, api, debugCode, DebugResult } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { registerMonacoThemes } from '../utils/monacoThemes';
import { formatToPoints } from '../utils/bulletPoints';
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
  const [validationFailed, setValidationFailed] = useState<boolean>(false);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DebugResult | null>(null);

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

  const handleCompareAndRun = async (overrideA?: string, overrideB?: string) => {
    const activeA = overrideA || codeA;
    const activeB = overrideB || codeB;
    setLoading(true);
    setValidationFailed(false);

    try {
      // Step 1: Pre-flight Code Correctness Validation for BOTH Program A & B
      const [valA, valB] = await Promise.all([
        validateCodeCorrectness(activeA, language, stdinInput),
        validateCodeCorrectness(activeB, language, stdinInput)
      ]);

      setOutputA(valA.isValid ? (valA.stdout || '➜ Program A executed cleanly') : `❌ Program A Compilation/Runtime Error:\n${valA.error}`);
      setOutputB(valB.isValid ? (valB.stdout || '➜ Program B executed cleanly') : `❌ Program B Compilation/Runtime Error:\n${valB.error}`);

      if (!valA.isValid || !valB.isValid) {
        setValidationFailed(true);
        setResult({
          lexicalScore: 0,
          structuralScore: 0,
          astScore: 0,
          semanticScore: 0,
          algorithmScore: 0,
          overallScore: 0,
          explanation: `⚠️ Code DNA Analysis Inconclusive: One or both programs failed compilation/execution. Program A is ${valA.isValid ? 'valid' : 'invalid (compilation error)'} and Program B is ${valB.isValid ? 'valid' : 'invalid (compilation error)'}. Algorithmic DNA similarity requires both programs to be syntactically valid and executable.`,
          details: {
            lexicalDetails: valA.isValid ? 'Program A verified clean' : 'Program A failed compilation',
            structuralDetails: valB.isValid ? 'Program B verified clean' : 'Program B failed compilation',
            astDetails: 'Inconclusive comparison'
          }
        });
        showToast('⚠️ Cannot compare: One or both programs contain errors!', 'error');
        setLoading(false);
        return;
      }

      // Step 2: Both programs verified valid! Proceed with full similarity calculation
      const simRes = await getCodeSimilarity(activeA, activeB, language);
      if (simRes) {
        setResult(simRes);
        showToast('✓ AI Code DNA Comparison verified & complete!', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Error computing similarity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnoseAndFix = async () => {
    setIsFixing(true);
    showToast('Diagnosing compiler error & synthesizing repair...', 'info');

    let newCodeA = codeA;
    let newCodeB = codeB;
    let diag: DebugResult | null = null;

    try {
      const isErrA = outputA && outputA.includes('❌ Program A');
      const isErrB = outputB && outputB.includes('❌ Program B');

      if (isErrA) {
        const resA = await debugCode(codeA, outputA || 'Program A error', language);
        if (resA && resA.fix && resA.fix.trim().length > 0) {
          newCodeA = resA.fix;
          setCodeA(newCodeA);
        }
        diag = resA;
      }

      if (isErrB) {
        const resB = await debugCode(codeB, outputB || 'Program B error', language);
        if (resB && resB.fix && resB.fix.trim().length > 0) {
          newCodeB = resB.fix;
          setCodeB(newCodeB);
        }
        if (!diag) diag = resB;
      }

      setDiagnosisResult(diag);
      setValidationFailed(false);
      showToast('✓ Program(s) repaired successfully! Re-running DNA comparison...', 'success');
      await handleCompareAndRun(newCodeA, newCodeB);
    } catch (err: any) {
      console.error('Similarity diagnosis failed:', err);
      showToast(err?.message || 'Failed to auto-repair programs', 'error');
    } finally {
      setIsFixing(false);
    }
  };

  const getSimilarityDiagnosticPoints = () => {
    if (diagnosisResult?.errorPoints && diagnosisResult.errorPoints.length > 0) {
      return diagnosisResult.errorPoints;
    }
    const pts: string[] = [];
    if (outputA && outputA.includes('❌ Program A')) {
      const firstLine = outputA.replace('❌ Program A Compilation/Runtime Error:\n', '').split('\n')[0];
      pts.push(`Program A Defect: ${firstLine}`);
    }
    if (outputB && outputB.includes('❌ Program B')) {
      const firstLine = outputB.replace('❌ Program B Compilation/Runtime Error:\n', '').split('\n')[0];
      pts.push(`Program B Defect: ${firstLine}`);
    }
    pts.push(`Code DNA & AST Invariant: Code similarity compares lexical tokens, control flow graphs, and vector embeddings. Broken programs cannot generate valid AST nodes.`);
    pts.push(`Execution Integrity: Both programs must successfully parse and execute before semantic logic equivalence can be measured.`);
    pts.push(`Remediation: Click "⚡ Diagnose & Fix Program(s)" to automatically repair syntax and delimiter errors.`);
    return pts;
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
        {validationFailed && (
          <div style={{ background: '#FCE8E0', border: '1.5px solid #C85A32', borderRadius: '8px', padding: '14px 18px', margin: '0 0 16px', color: '#8A2A0B', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13.5px' }}>
                <AlertTriangle size={16} style={{ color: '#C85A32' }} />
                <span>Code Correctness Check Failed: One or Both Programs Contain Errors</span>
              </div>
              <button
                onClick={handleDiagnoseAndFix}
                disabled={isFixing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #C85A32 0%, #B24620 100%)',
                  color: '#FFF',
                  border: '1px solid rgba(0,0,0,0.1)',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: isFixing ? 'not-allowed' : 'pointer'
                }}
                title="Automatically diagnose error, repair code, and re-run similarity analysis"
              >
                {isFixing ? (
                  <>
                    <Loader2 size={13} className="spin-icon" />
                    <span>Diagnosing &amp; Repairing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>⚡ Diagnose &amp; Fix Broken Program(s)</span>
                  </>
                )}
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: '#5C4E44', lineHeight: 1.4 }}>
              Algorithmic DNA similarity requires both programs to be syntactically valid and executable. Check the console outputs below to see the exact compiler or runtime errors.
            </p>

            {/* Pointwise Diagnostics */}
            <div style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(200,90,50,0.3)', borderRadius: 6, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#8A2A0B' }}>
                <Info size={13} style={{ color: '#C85A32' }} />
                <span>Root Cause Analysis &amp; Compiler Diagnostics (Pointwise):</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {getSimilarityDiagnosticPoints().map((pt, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#4A3E38', lineHeight: 1.4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', backgroundColor: '#C85A32', color: '#FFF', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{idx + 1}</span>
                    <span style={{ flex: 1 }}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {diagnosisResult && diagnosisResult.fixPoints && diagnosisResult.fixPoints.length > 0 && (
              <div style={{ background: 'rgba(235, 246, 238, 0.8)', border: '1px solid rgba(76, 122, 93, 0.35)', borderRadius: 6, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#2A5A3D' }}>
                  <CheckCircle2 size={13} style={{ color: '#2A5A3D' }} />
                  <span>How The Program(s) Were Fixed (Pointwise):</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {diagnosisResult.fixPoints.map((pt, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#4A3E38', lineHeight: 1.4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', backgroundColor: '#4C7A5D', color: '#FFF', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{idx + 1}</span>
                      <span style={{ flex: 1 }}>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {result ? (
          <>
            <div className="stats-top-row">
              <div className="stats-score-left">
                <div className={`score-badge-circle ${validationFailed ? 'high-risk' : isHighRisk ? 'high-risk' : 'low-risk'}`}>
                  <span className="score-huge">{overallScorePct}%</span>
                  <span className="score-label">{validationFailed ? 'ERROR' : 'MATCH'}</span>
                </div>
                <div className="verdict-summary">
                  <h4 style={{ color: validationFailed ? '#C85A32' : isHighRisk ? '#C85A32' : '#2A5A3D' }}>
                    {validationFailed 
                      ? '⚠️ Inconclusive: Code Execution / Compilation Failure' 
                      : isHighRisk 
                      ? '⚠️ High Structural Similarity / Plagiarism Risk' 
                      : '✓ Low Similarity / Distinct Implementations'}
                  </h4>
                  <ul className="verdict-points-list">
                    {formatToPoints(result.explanation || (isHighRisk 
                      ? 'The structural signatures are highly similar, indicating identical algorithmic logic.'
                      : 'Both programs exhibit distinct structures with divergent logic.')).map((point, idx) => (
                      <li key={idx} className="verdict-point-item">
                        <span className="bullet-glyph">▸</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
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
