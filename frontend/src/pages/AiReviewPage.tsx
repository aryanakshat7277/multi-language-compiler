import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Brain, Sparkles, Loader2, Bug, CheckCircle2, Zap, AlertTriangle, Tag, Play } from 'lucide-react';
import { getAiExplanation, getAiTests, getAiDebug, getAiReview, ExplanationResult, TestsResult, DebugResult, ReviewResult } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { registerMonacoThemes } from '../utils/monacoThemes';
import './AiReviewPage.css';

const DEFAULT_AI_CODE = `function mergeSortedArrays(a, b) {
  let result = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] < b[j]) { result.push(a[i++]); }
    else { result.push(b[j++]); }
  }
  return result.concat(a.slice(i)).concat(b.slice(j));
}`;

type Mode = 'explain' | 'tests' | 'debug' | 'review';

const severityColor = (s: string) =>
  s === 'high' ? '#C85A32' : s === 'medium' ? '#E08A3C' : '#8B5A2B';

export default function AiReviewPage() {
  const [code, setCode] = useState(DEFAULT_AI_CODE);
  const [language, setLanguage] = useState('javascript');
  const [mode, setMode] = useState<Mode>('explain');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorOutput, setErrorOutput] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const { showToast } = useToast();

  const modes = [
    { id: 'explain', label: 'Explain Logic' },
    { id: 'tests',   label: 'Generate Tests' },
    { id: 'debug',   label: 'Debug Code' },
    { id: 'review',  label: 'Code Review' },
  ];

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      let res: any;
      if (mode === 'explain') res = await getAiExplanation(code, language);
      else if (mode === 'tests') res = await getAiTests(code, language, problemDesc);
      else if (mode === 'debug') res = await getAiDebug(code, errorOutput, language);
      else if (mode === 'review') res = await getAiReview(code, language);
      setResult(res);
      showToast('Gemini AI Analysis complete!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error contacting AI service', 'error');
    } finally {
      setLoading(false);
    }
  };

  const btnLabel = { explain: 'Explain Code', tests: 'Generate Tests', debug: 'Debug Error', review: 'Review Code' }[mode];

  return (
    <div className="light-ai-page page-enter">
      {/* Left Panel */}
      <div className="ai-panel left-panel">
        <div className="ai-panel-header">
          <div className="segmented-tabs-track">
            {modes.map(m => (
              <button key={m.id} className={`segmented-tab-item ${mode === m.id ? 'active' : ''}`}
                onClick={() => { setMode(m.id as Mode); setResult(null); }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Debug Specific Form & Button */}
        {mode === 'debug' && (
          <div style={{ padding: '10px 20px 12px', background: '#FAF4EE', borderBottom: '1px solid #E4D9CE' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#C85A32', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Error / Stack Trace (optional):
            </label>
            <textarea 
              value={errorOutput} 
              onChange={e => setErrorOutput(e.target.value)}
              rows={3} 
              placeholder="Paste your error output or stack trace here to get pinpoint debugging..."
              style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #C8B6A6', borderRadius: '6px', backgroundColor: '#F5ECE3', color: '#2D231E', fontFamily: 'var(--font-mono)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} 
            />
            <button className="btn btn-primary btn-sm" onClick={handleAnalyze} disabled={loading} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              {loading ? <Loader2 size={13} className="spin-icon" /> : <Bug size={13} />}
              <span>Debug Code with Gemini AI</span>
            </button>
          </div>
        )}

        {/* Generate Tests Specific Form & Button */}
        {mode === 'tests' && (
          <div style={{ padding: '10px 20px 12px', background: '#FAF4EE', borderBottom: '1px solid #E4D9CE' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#C85A32', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Problem Description (optional):
            </label>
            <input 
              value={problemDesc} 
              onChange={e => setProblemDesc(e.target.value)}
              placeholder="Describe what this function should do to generate targeted test cases..."
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #C8B6A6', borderRadius: '6px', backgroundColor: '#F5ECE3', color: '#2D231E', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} 
            />
            <button className="btn btn-primary btn-sm" onClick={handleAnalyze} disabled={loading} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              {loading ? <Loader2 size={13} className="spin-icon" /> : <CheckCircle2 size={13} />}
              <span>Generate Test Cases with Gemini AI</span>
            </button>
          </div>
        )}

        <div className="ai-editor-fill">
          <Editor height="100%" language={language} theme="clay-light" beforeMount={registerMonacoThemes} value={code}
            onChange={v => setCode(v || '')}
            options={{ minimap: { enabled: false }, fontSize: 13.5, fontFamily: "'JetBrains Mono', Consolas, monospace", padding: { top: 12 } }} />
        </div>

        <div className="ai-panel-footer">
          <button className="btn btn-primary btn-run-ai-review" onClick={handleAnalyze} disabled={loading}>
            {loading
              ? <><Loader2 size={15} className="spin-icon" /><span>Analyzing with Gemini...</span></>
              : <><Sparkles size={15} /><span>{btnLabel}</span></>}
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div className="ai-panel right-panel">
        <div className="ai-panel-header">
          <div className="panel-title-with-icon">
            <Sparkles size={16} className="text-violet-accent" />
            <h3 className="panel-title-text">Code Intelligence Report</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {result && <span className="badge-pill status-pill-ai">Report Generated</span>}
            <select value={language} onChange={e => setLanguage(e.target.value)} className="ai-lang-select">
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="typescript">TypeScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>
        </div>

        <div className="ai-output-scroll-container">
          {!result && !loading && (
            <div className="empty-state-container">
              <div className="empty-state-circle violet"><Brain size={48} className="empty-state-icon" /></div>
              <h4 className="empty-state-title">AI Code Mentor Ready</h4>
              <p className="empty-state-desc">Click below to run Gemini 2.5 Flash AI analysis for <strong>{btnLabel}</strong>.</p>
              
              <button 
                className="btn btn-primary" 
                onClick={handleAnalyze}
                style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
              >
                <Sparkles size={16} />
                <span>{btnLabel} Now</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="empty-state-container">
              <div className="empty-state-circle violet"><Loader2 size={48} className="empty-state-icon spin-icon" /></div>
              <h4 className="empty-state-title">Analyzing with Gemini AI</h4>
              <p className="empty-state-desc">Processing your code through Google Gemini 2.5 Flash...</p>
            </div>
          )}

          {result && !loading && (
            <div className="ai-result-view" style={{ padding: '16px' }}>

              {/* EXPLAIN */}
              {mode === 'explain' && (() => {
                const r = result as ExplanationResult;
                return (
                  <div>
                    <div style={{ background: '#FAF4EE', border: '1px solid #E4D9CE', borderRadius: 8, padding: '16px', marginBottom: 16 }}>
                      <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14, color: '#2D231E', whiteSpace: 'pre-wrap' }}>{r.explanation}</p>
                    </div>
                    {r.keyConcepts && r.keyConcepts.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#8B5A2B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Concepts</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {r.keyConcepts.map((c, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#EBF4EF', color: '#2A5A3D', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              <Tag size={10} />{c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TESTS */}
              {mode === 'tests' && (() => {
                const r = result as TestsResult;
                return (
                  <div>
                    {r.explanation && <p style={{ fontSize: 13, color: '#5C4D44', marginBottom: 12, lineHeight: 1.6 }}>{r.explanation}</p>}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E4D9CE' }}>
                          {['#', 'Input', 'Expected Output'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#8B5A2B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(r.testCases || []).map((tc, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #E4D9CE', background: i % 2 === 0 ? '#FAF4EE' : 'transparent' }}>
                            <td style={{ padding: '8px', fontWeight: 700, color: '#C85A32', width: 28 }}>{i + 1}</td>
                            <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{tc.input}</td>
                            <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#2A5A3D', fontWeight: 600 }}>{tc.expectedOutput}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* DEBUG */}
              {mode === 'debug' && (() => {
                const r = result as DebugResult;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#FDF0ED', border: '1.5px solid #C85A32', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#C85A32', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Root Cause</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: '#2D231E', lineHeight: 1.6 }}>{r.rootCause}</p>
                    </div>
                    {r.hints && r.hints.length > 0 && (
                      <div style={{ background: '#FDF3E7', border: '1.5px solid #E08A3C', borderRadius: 8, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#B35E17', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Debugging Hints</div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {r.hints.map((h, i) => <li key={i} style={{ fontSize: 13, marginBottom: 6, color: '#2D231E', lineHeight: 1.55 }}>{h}</li>)}
                        </ul>
                      </div>
                    )}
                    <div style={{ background: '#EBF4EF', border: '1.5px solid #2A5A3D', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#2A5A3D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Suggested Fix</div>
                      <p style={{ margin: 0, fontSize: 13, color: '#2D231E', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.fix}</p>
                    </div>
                  </div>
                );
              })()}

              {/* REVIEW */}
              {mode === 'review' && (() => {
                const r = result as ReviewResult;
                const q = r.overallQuality || 0;
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#FAF4EE', border: '1px solid #E4D9CE', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                      <div style={{ textAlign: 'center', minWidth: 56 }}>
                        <div style={{ fontSize: 38, fontWeight: 900, color: q >= 70 ? '#2A5A3D' : q >= 40 ? '#E08A3C' : '#C85A32', lineHeight: 1 }}>{q}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#8B5A2B', marginTop: 2 }}>Quality</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, background: '#E4D9CE', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ width: `${q}%`, height: '100%', background: q >= 70 ? '#2A5A3D' : q >= 40 ? '#E08A3C' : '#C85A32', borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ fontSize: 12, color: '#5C4D44' }}>{r.issues?.length || 0} issue(s) found · {r.suggestions?.length || 0} suggestion(s)</div>
                      </div>
                    </div>
                    {(r.issues || []).map((issue, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#FAF4EE', border: `1px solid ${severityColor(issue.severity)}`, borderLeft: `4px solid ${severityColor(issue.severity)}`, borderRadius: 6, marginBottom: 8 }}>
                        <AlertTriangle size={14} style={{ color: severityColor(issue.severity), flexShrink: 0, marginTop: 2 }} />
                        <div>
                          {issue.line && <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5A2B', textTransform: 'uppercase', marginRight: 8 }}>Line {issue.line}</span>}
                          <span style={{ fontSize: 13, color: '#2D231E' }}>{issue.message}</span>
                          <span style={{ display: 'inline-block', marginLeft: 8, padding: '1px 6px', background: severityColor(issue.severity) + '22', color: severityColor(issue.severity), borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{issue.severity}</span>
                        </div>
                      </div>
                    ))}
                    {(r.suggestions || []).length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#8B5A2B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Suggestions</div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {r.suggestions.map((s, i) => <li key={i} style={{ fontSize: 13, marginBottom: 5, color: '#2D231E', lineHeight: 1.55 }}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
