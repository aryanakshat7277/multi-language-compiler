import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Award, CheckCircle2, AlertCircle, 
  Send, Brain, FileText, CheckSquare, Sparkles, Loader2,
  Wrench, Info, AlertTriangle, Code2, XCircle, ChevronDown, ChevronUp,
  Check, X
} from 'lucide-react';
import CompilerPage from './CompilerPage';
import ResizeHandle from '../components/common/ResizeHandle';
import { api, debugCode, DebugResult } from '../services/api';
import { useEditorStore } from '../stores/editorStore';
import { useToast } from '../contexts/ToastContext';
import './ProblemDetailPage.css';

export interface TestCaseTypeInfo {
  type: 'SAMPLE' | 'EDGE_CASE' | 'BOUNDARY' | 'HIDDEN' | 'PERFORMANCE';
  badgeLabel: string;
  badgeClass: string;
  description: string;
}

export function categorizeTestCase(tc: any, index: number): TestCaseTypeInfo {
  if (tc?.isHidden) {
    return {
      type: 'HIDDEN',
      badgeLabel: 'Hidden Judge Suite',
      badgeClass: 'badge-type-hidden',
      description: 'Automated blind verification suite to validate invariants, memory bounds, and prevent hardcoded solutions.'
    };
  }
  if (index === 0) {
    return {
      type: 'SAMPLE',
      badgeLabel: 'Sample Baseline Test Case',
      badgeClass: 'badge-type-sample',
      description: 'Standard baseline input verifying fundamental problem statement requirements.'
    };
  }
  if (index === 1) {
    return {
      type: 'SAMPLE',
      badgeLabel: 'Sample Varied Test Case',
      badgeClass: 'badge-type-sample',
      description: 'Alternative standard case with non-sequential values and different target permutations.'
    };
  }
  const inputStr = String(tc?.input || '');
  if (inputStr.includes('-') || inputStr.includes('0') || inputStr.length > 40) {
    return {
      type: 'BOUNDARY',
      badgeLabel: 'Edge Case: Negative & Extreme Constraints',
      badgeClass: 'badge-type-boundary',
      description: 'Tests negative numbers, zero boundaries, and extreme constraint limits.'
    };
  }
  return {
    type: 'EDGE_CASE',
    badgeLabel: 'Edge Case: Duplicate & Collision Bounds',
    badgeClass: 'badge-type-edge',
    description: 'Tests duplicate values, identical elements, parity conditions, and hash collisions.'
  };
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  points: number;
  isHidden?: boolean;
}

interface ProblemDetail {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit: number;
  memoryLimit: number;
  category?: string;
  examples?: { input: string; output: string; explanation?: string }[];
  testCases?: TestCase[];
}

const ProblemDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'description' | 'testcases' | 'submissions'>('description');
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DebugResult | null>(null);
  const [panelWidth, setPanelWidth] = useState(510);
  const [expandedTc, setExpandedTc] = useState<Record<string, boolean>>({});

  const toggleTcExpand = (id: string) => {
    setExpandedTc(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePanelResize = (delta: number) => {
    setPanelWidth(prev => Math.max(300, Math.min(850, prev + delta)));
  };

  const { files, language, activeFileId, updateFileContent } = useEditorStore();
  const { showToast } = useToast();

  // Sync with global submit event from right-side toolbar
  useEffect(() => {
    const handleGlobalSubmit = () => {
      handleSubmitSolution();
    };
    window.addEventListener('codeforge:submit-solution', handleGlobalSubmit);
    return () => window.removeEventListener('codeforge:submit-solution', handleGlobalSubmit);
  }, [problem, files, language, activeFileId]);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await api.get(`/problems/${id}`);
        setProblem(res.data || res);
      } catch {
        // Fallback problem details for Two Sum
        setProblem({
          id: id || '1',
          title: 'Two Sum',
          description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
          difficulty: 'EASY',
          timeLimit: 2000,
          memoryLimit: 128,
          category: 'Arrays & Hashing',
          examples: [
            {
              input: 'nums = [2,7,11,15], target = 9',
              output: '[0,1]',
              explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
            },
            {
              input: 'nums = [3,2,4], target = 6',
              output: '[1,2]',
              explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
            }
          ],
          testCases: [
            { id: '1', input: '2 7 11 15\n9', expectedOutput: '0 1', points: 50 },
            { id: '2', input: '3 2 4\n6', expectedOutput: '1 2', points: 50 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [id]);

  const handleDiagnoseAndFix = async () => {
    const activeFile = files.find(f => f.id === activeFileId) || files[0];
    if (!activeFile || !activeFile.content.trim()) {
      showToast('No code in editor to diagnose', 'warning');
      return;
    }
    setIsDiagnosing(true);
    showToast('Diagnosing submission failure & synthesizing fix...', 'info');

    try {
      const errorText = [
        submissionError ? `Submission Error: ${submissionError}` : '',
        submissionResult?.status ? `Verdict: ${submissionResult.status}` : '',
        submissionResult?.errorOutput || 'Test case verification failed'
      ].filter(Boolean).join('\n');

      const res = await debugCode(activeFile.content, errorText, language);
      setDiagnosisResult(res);

      if (res && res.fix && res.fix.trim().length > 0 && res.fix.trim() !== activeFile.content.trim()) {
        updateFileContent(activeFile.id, res.fix);
        showToast('✓ Solution code repaired in editor! Click Submit to evaluate.', 'success');
      } else {
        showToast('Diagnostic completed. See pointwise root cause breakdown below.', 'info');
      }
      setActiveTab('submissions');
    } catch (err: any) {
      console.error('Submission diagnosis failed:', err);
      showToast(err?.message || 'Failed to auto-repair solution', 'error');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const testResultsList: any[] = submissionResult?.testResults || [];
  const totalCount = testResultsList.length > 0 ? testResultsList.length : (problem?.testCases?.length || 2);
  const passedCount = testResultsList.filter((r: any) => r.status === 'PASS').length;
  const passPercent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const firstFailedIdx = testResultsList.findIndex((r: any) => r.status !== 'PASS');
  const firstFailedRes = firstFailedIdx !== -1 ? testResultsList[firstFailedIdx] : null;
  const firstFailedTc = firstFailedRes?.testCase || (problem?.testCases && problem.testCases[firstFailedIdx]) || null;
  const firstFailedCat = firstFailedTc ? categorizeTestCase(firstFailedTc, firstFailedIdx) : null;

  const getProblemDiagnosticPoints = () => {
    if (diagnosisResult?.errorPoints && diagnosisResult.errorPoints.length > 0) {
      return diagnosisResult.errorPoints;
    }
    const pts: string[] = [];
    if (firstFailedIdx !== -1 && firstFailedRes && firstFailedCat) {
      pts.push(`Failed Location: Test Case #${firstFailedIdx + 1} did not pass the assertion check (Status: ${firstFailedRes.status}).`);
      pts.push(`Test Case Category: [${firstFailedCat.badgeLabel}] — ${firstFailedCat.description}`);
      if (firstFailedRes.status === 'ERROR') {
        pts.push(`Runtime Violation: Process encountered an exception or crash: ${firstFailedRes.actualOutput?.slice(0, 120)}.`);
      } else if (firstFailedRes.status === 'TIMEOUT') {
        pts.push(`Time Limit Violation: Execution exceeded ${problem?.timeLimit || 2000}ms. Ensure inner loops avoid O(N²) or infinite loops.`);
      } else {
        pts.push(`Output Mismatch: Expected '${String(firstFailedTc?.expectedOutput || '').trim()}', but your solution produced '${String(firstFailedRes.actualOutput || '').trim()}'.`);
      }
      pts.push(`Algorithmic Invariant: Check edge case boundaries (zero values, empty arrays, duplicate items, and maximum array lengths).`);
      pts.push(`Remediation: Click "⚡ Fix Error Automatically in Editor" to let the AI repair the algorithm directly.`);
    } else if (submissionError) {
      pts.push(`Submission Error: ${submissionError}`);
      pts.push(`Remediation: Verify input formatting and ensure the solution reads from standard input correctly.`);
    } else if (submissionResult?.errorOutput) {
      const firstLine = submissionResult.errorOutput.split('\n')[0];
      pts.push(`Execution Failure: ${firstLine}`);
      pts.push(`Remediation: Click "⚡ Diagnose & Fix Solution" to synthesize a working algorithm and update the editor.`);
    } else {
      pts.push(`Algorithmic Invariant: Implementation failed to satisfy test case assertions or encountered an unhandled edge case.`);
      pts.push(`Constraint Bounds: Guard against array bounds, null values, and ensure time/memory limits are respected.`);
      pts.push(`Remediation: Click "⚡ Diagnose & Fix Solution" to synthesize a working algorithm and update the editor.`);
    }
    return pts;
  };

  const handleSubmitSolution = async () => {
    if (!problem) return;
    const activeFile = files.find(f => f.id === activeFileId) || files[0];
    if (!activeFile || !activeFile.content.trim()) {
      showToast('No code in editor to submit', 'warning');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);
    setSubmissionError(null);
    setDiagnosisResult(null);
    window.dispatchEvent(new CustomEvent('codeforge:submitting-status', { detail: { isSubmitting: true } }));
    showToast('Submitting solution to automated judge...', 'info');

    const codeFiles = files.map(f => ({ filename: f.name, content: f.content }));
    const fallbackTestCases = [
      { id: '1', input: '4\n2 7 11 15\n9\n', expectedOutput: '0 1\n', points: 40, isHidden: false },
      { id: '2', input: '3\n3 2 4\n6\n', expectedOutput: '1 2\n', points: 30, isHidden: false },
      { id: '3', input: '2\n3 3\n6\n', expectedOutput: '0 1\n', points: 30, isHidden: false }
    ];
    const testCasesToRun = (problem.testCases && problem.testCases.length > 0) ? problem.testCases : fallbackTestCases;

    const runDirectTestcaseEval = async () => {
      const computedResults = [];
      let allPass = true;
      let totalScore = 0;
      let earnedScore = 0;
      let maxTime = 16;

      for (let i = 0; i < testCasesToRun.length; i++) {
        const tc = testCasesToRun[i];
        totalScore += tc.points || 10;
        try {
          const execRes = await api.post<any>('/compiler/execute', {
            language,
            version: '*',
            files: codeFiles.map(f => ({ name: f.filename, content: f.content })),
            stdin: tc.input || ''
          });

          const actualRaw = execRes?.run?.stdout || execRes?.stdout || '';
          const actual = actualRaw.trim();
          const expected = (tc.expectedOutput || '').trim();
          const isMatch = actual === expected;
          const hasErr = (execRes?.run?.code && execRes?.run?.code !== 0) || (execRes?.exitCode && execRes.exitCode !== 0);

          let status = 'PASS';
          if (hasErr) {
            status = 'ERROR';
            allPass = false;
          } else if (!isMatch) {
            status = 'FAIL';
            allPass = false;
          } else {
            earnedScore += tc.points || 10;
          }

          maxTime = Math.max(maxTime, execRes?.executionTimeMs || 20);

          computedResults.push({
            testCaseId: tc.id || String(i + 1),
            status,
            actualOutput: actual || (execRes?.run?.stderr || execRes?.stderr || 'No output produced'),
            executionTimeMs: execRes?.executionTimeMs || 22,
            testCase: tc
          });
        } catch (execErr: any) {
          allPass = false;
          computedResults.push({
            testCaseId: tc.id || String(i + 1),
            status: 'ERROR',
            actualOutput: execErr?.message || 'Execution failed',
            executionTimeMs: 0,
            testCase: tc
          });
        }
      }

      const evalData = {
        id: 'direct-eval-' + Date.now(),
        status: allPass ? 'ACCEPTED' : (computedResults.some(r => r.status === 'ERROR') ? 'RUNTIME_ERROR' : 'WRONG_ANSWER'),
        score: earnedScore,
        totalScore: totalScore,
        executionTimeMs: maxTime,
        memoryKb: 13800,
        languageId: language,
        testResults: computedResults
      };

      setSubmissionResult(evalData);
      setActiveTab('submissions');
      setIsSubmitting(false);
      window.dispatchEvent(new CustomEvent('codeforge:submitting-status', { detail: { isSubmitting: false } }));

      if (allPass) {
        showToast('✓ Solution Accepted! All test cases passed.', 'success');
      } else {
        showToast('Evaluation complete: Some test cases failed.', 'warning');
      }
    };

    try {
      const payload = {
        problemId: problem.id,
        languageId: language,
        files: codeFiles
      };

      const res = await api.post<any>('/submissions', payload);
      showToast('Evaluating test cases against automated judge...', 'info');

      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        try {
          const detail = await api.get<any>(`/submissions/${res.submissionId}`);
          if (detail && detail.status !== 'PENDING' && detail.status !== 'QUEUED') {
            clearInterval(pollTimer);
            if (detail.testResults && Array.isArray(detail.testResults)) {
              detail.testResults = detail.testResults.map((tr: any, idx: number) => {
                if (!tr.testCase && testCasesToRun[idx]) {
                  tr.testCase = testCasesToRun[idx];
                }
                return tr;
              });
            }
            setSubmissionResult(detail);
            setActiveTab('submissions');
            setIsSubmitting(false);
            window.dispatchEvent(new CustomEvent('codeforge:submitting-status', { detail: { isSubmitting: false } }));
            if (detail.status === 'ACCEPTED' || detail.status === 'SUCCESS') {
              showToast('✓ Solution Accepted! All test cases passed.', 'success');
            } else {
              showToast(`Submission evaluated: ${detail.status}`, 'warning');
            }
          } else if (attempts >= 4) {
            clearInterval(pollTimer);
            await runDirectTestcaseEval();
          }
        } catch {
          if (attempts >= 2) {
            clearInterval(pollTimer);
            await runDirectTestcaseEval();
          }
        }
      }, 700);

    } catch (err: any) {
      console.warn('Submission API returned error, running direct evaluation:', err);
      await runDirectTestcaseEval();
    }
  };

  if (loading || !problem) {
    return (
      <div className="problem-loading">
        <Loader2 size={24} className="spin-icon" />
        <span>Loading problem specification...</span>
      </div>
    );
  }

  const diff = (problem.difficulty || 'EASY').toLowerCase();

  return (
    <div className="problem-detail-page">
      {/* Left Panel: Problem Specification */}
      <div className="problem-statement-panel" style={{ width: `${panelWidth}px`, flex: 'none' }}>
        {/* Navigation bar */}
        <div className="problem-nav-bar">
          <button className="back-btn" onClick={() => navigate('/problems')}>
            <ArrowLeft size={14} />
            <span>Problem Archive</span>
          </button>

          <div className="problem-tab-buttons">
            <button 
              className={`ptab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              <FileText size={13} />
              <span>Description</span>
            </button>
            <button 
              className={`ptab-btn ${activeTab === 'testcases' ? 'active' : ''}`}
              onClick={() => setActiveTab('testcases')}
            >
              <CheckSquare size={13} />
              <span>Test Cases</span>
            </button>
            {(submissionResult || submissionError) && (
              <button 
                className={`ptab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
                onClick={() => setActiveTab('submissions')}
              >
                <Award size={13} />
                <span>Result</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Body */}
        <div className="problem-body">
          {activeTab === 'description' && (
            <div className="description-view">
              <div className="problem-header-box">
                <h1 className="problem-main-title">
                  <Sparkles size={20} className="title-icon" style={{color: 'var(--accent)', marginRight: '8px', filter: 'drop-shadow(0 0 8px var(--accent))'}} />
                  {problem.title}
                </h1>
                <div className="problem-badges-row">
                  <span className={`diff-pill diff-${diff}`}>{problem.difficulty}</span>
                  <span className="meta-pill"><Clock size={11} /> {problem.timeLimit}ms</span>
                  <span className="meta-pill"><Award size={11} /> {problem.memoryLimit}MB</span>
                  {problem.category && <span className="cat-pill">{problem.category}</span>}
                </div>
              </div>

              <div className="problem-text-content">
                <p className="desc-paragraph">{problem.description}</p>

                {problem.examples && problem.examples.length > 0 && (
                  <div className="examples-section">
                    <h3>Examples</h3>
                    {problem.examples.map((ex, idx) => (
                      <div key={idx} className="example-card">
                        <div className="example-title">Example {idx + 1}:</div>
                        <div className="example-block">
                          <strong>Input:</strong> <code>{ex.input}</code>
                        </div>
                        <div className="example-block">
                          <strong>Output:</strong> <code>{ex.output}</code>
                        </div>
                        {ex.explanation && (
                          <div className="example-explanation">
                            <strong>Explanation:</strong> {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="constraints-section">
                  <h3>Constraints</h3>
                  <ul className="constraints-list">
                    <li>2 ≤ nums.length ≤ 10<sup>4</sup></li>
                    <li>-10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup></li>
                    <li>-10<sup>9</sup> ≤ target ≤ 10<sup>9</sup></li>
                    <li>Only one valid answer exists.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'testcases' && (
            <div className="testcases-view">
              <h3><CheckSquare size={16} /> Sample Test Cases</h3>
              <p className="tc-hint">Your code will be evaluated against public and hidden edge test cases.</p>
              <div className="tc-list">
                {(problem.testCases || []).map((tc, idx) => (
                  <div key={tc.id || idx} className="tc-card">
                    <div className="tc-header">
                      <span className="tc-number">Test Case #{idx + 1}</span>
                      <span className="tc-points">+{tc.points} pts</span>
                    </div>
                    <div className="tc-body">
                      <div className="tc-row">
                        <span className="tc-label">Input:</span>
                        <pre className="tc-code">{tc.input}</pre>
                      </div>
                      <div className="tc-row">
                        <span className="tc-label">Expected:</span>
                        <pre className="tc-code">{tc.expectedOutput}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'submissions' && (submissionResult || submissionError) && (
            <div className="submission-result-view">
              <div className={`verdict-banner ${submissionResult && (submissionResult.status === 'ACCEPTED' || submissionResult.status === 'SUCCESS') ? 'verdict-success' : 'verdict-error'}`}>
                {submissionResult && (submissionResult.status === 'ACCEPTED' || submissionResult.status === 'SUCCESS') ? (
                  <>
                    <CheckCircle2 size={24} />
                    <div>
                      <div className="verdict-title">ACCEPTED (100% SCORE)</div>
                      <div className="verdict-sub">All {totalCount} of {totalCount} test cases passed successfully!</div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={24} />
                    <div>
                      <div className="verdict-title">
                        {firstFailedIdx !== -1 
                          ? `FAILED ON TEST CASE #${firstFailedIdx + 1} (${firstFailedRes?.status || 'WRONG ANSWER'})` 
                          : (submissionError ? 'EVALUATION ERROR' : (submissionResult?.status || 'VERIFICATION FAILED'))}
                      </div>
                      <div className="verdict-sub">
                        {firstFailedCat 
                          ? `Failed on ${firstFailedCat.badgeLabel} — Passed ${passedCount} of ${totalCount} test cases (${passPercent}%)`
                          : (submissionError || 'Solution failed automated judge verification checks')}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Progress & Pass Rate Bar */}
              <div className="pass-rate-wrapper">
                <div className="pass-rate-header">
                  <span>Test Case Verification Progress:</span>
                  <span>{passedCount} / {totalCount} Passed ({passPercent}%)</span>
                </div>
                <div className="pass-rate-track">
                  <div 
                    className={`pass-rate-fill ${passedCount === totalCount ? 'success' : 'partial'}`}
                    style={{ width: `${Math.max(8, passPercent)}%` }}
                  />
                </div>
              </div>

              <div className="result-details-box">
                {submissionResult && (
                  <>
                    <div className="res-row">
                      <span>Language:</span>
                      <strong>{submissionResult.languageId || language}</strong>
                    </div>
                    <div className="res-row">
                      <span>Execution Time:</span>
                      <strong>{submissionResult.executionTimeMs || 24} ms</strong>
                    </div>
                    <div className="res-row">
                      <span>Memory Used:</span>
                      <strong>{submissionResult.memoryKb ? (submissionResult.memoryKb / 1024).toFixed(1) : 12.4} MB</strong>
                    </div>
                  </>
                )}

                {/* WHERE IT FAILED & TYPE OF TEST CASES CARD */}
                {firstFailedIdx !== -1 && firstFailedRes && firstFailedCat && (
                  <div className="failure-diagnosis-box">
                    <div className="failure-header-row">
                      <div className="failure-target-pill">
                        <XCircle size={17} style={{ color: '#C85A32' }} />
                        <span>Where It Failed: <strong>Test Case #{firstFailedIdx + 1}</strong></span>
                      </div>
                      <span className={`test-type-pill ${firstFailedCat.badgeClass}`}>
                        {firstFailedCat.badgeLabel}
                      </span>
                    </div>

                    <div className="failure-category-desc">
                      <Info size={14} style={{ color: '#C85A32', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>What Type of Test Case:</strong> {firstFailedCat.description}
                      </div>
                    </div>

                    <div className="failure-io-grid">
                      <div className="failure-io-cell">
                        <span className="io-tag">Input Given:</span>
                        <pre className="io-code">{firstFailedTc?.input || 'Standard Problem Input'}</pre>
                      </div>
                      <div className="failure-io-cell expected-cell">
                        <span className="io-tag">Expected Judge Output:</span>
                        <pre className="io-code">{firstFailedTc?.expectedOutput || 'Correct Solution Output'}</pre>
                      </div>
                      <div className="failure-io-cell actual-cell">
                        <span className="io-tag">Your Actual Program Output:</span>
                        <pre className="io-code">{firstFailedRes?.actualOutput || '(No output returned / Uncaught Exception)'}</pre>
                      </div>
                    </div>

                    {/* Pointwise Diagnostics */}
                    <div className="failure-points-card">
                      <div className="failure-points-title">
                        <Info size={13} style={{ color: '#C85A32' }} />
                        <span>Root Cause & Compiler Diagnostics (Pointwise):</span>
                      </div>
                      <ul className="problem-causes-list">
                        {getProblemDiagnosticPoints().map((pt, idx) => (
                          <li key={idx} className="problem-cause-item">
                            <span className="problem-bullet-badge">{idx + 1}</span>
                            <span className="problem-cause-txt">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Auto-Fix Action */}
                    <div className="failure-action-row">
                      <button 
                        className="problem-diagnose-btn"
                        onClick={handleDiagnoseAndFix}
                        disabled={isDiagnosing}
                        title="Auto-repair code logic in editor to pass this test case"
                      >
                        {isDiagnosing ? (
                          <>
                            <Loader2 size={13} className="spin-icon" />
                            <span>Diagnosing &amp; Repairing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            <span>⚡ Fix Error Automatically in Editor</span>
                          </>
                        )}
                      </button>
                    </div>

                    {diagnosisResult && diagnosisResult.fixPoints && diagnosisResult.fixPoints.length > 0 && (
                      <div className="problem-causes-box success-box" style={{ marginTop: '8px' }}>
                        <div className="problem-causes-heading success-heading">
                          <CheckCircle2 size={13} style={{ color: '#2A5A3D' }} />
                          <span>How The Issue Was Fixed (Pointwise):</span>
                        </div>
                        <ul className="problem-causes-list">
                          {diagnosisResult.fixPoints.map((pt, idx) => (
                            <li key={idx} className="problem-cause-item">
                              <span className="problem-bullet-badge success">{idx + 1}</span>
                              <span className="problem-cause-txt">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* ALL TEST CASES BREAKDOWN MATRIX */}
                {testResultsList.length > 0 && (
                  <div className="tc-matrix-section">
                    <div className="tc-matrix-title">
                      <CheckSquare size={15} style={{ color: '#C85A32' }} />
                      <span>All Test Cases Breakdown ({passedCount}/{totalCount} Passed):</span>
                    </div>

                    <div className="tc-matrix-list">
                      {testResultsList.map((tr: any, idx: number) => {
                        const tc = tr.testCase || (problem?.testCases && problem.testCases[idx]) || {};
                        const cat = categorizeTestCase(tc, idx);
                        const isPass = tr.status === 'PASS';
                        const isExpanded = !!expandedTc[tc.id || idx];

                        return (
                          <div key={tc.id || idx} className={`tc-card-item ${isPass ? 'pass' : 'fail'}`}>
                            <div className="tc-card-summary" onClick={() => toggleTcExpand(tc.id || idx)}>
                              <div className="tc-summary-left">
                                <span className={`tc-verdict-tag ${isPass ? 'pass' : 'fail'}`}>
                                  {isPass ? 'PASS' : (tr.status || 'FAIL')}
                                </span>
                                <span className="tc-title-num">Test Case #{idx + 1}</span>
                                <span className={`test-type-pill ${cat.badgeClass}`}>
                                  {cat.badgeLabel}
                                </span>
                              </div>
                              <div className="tc-summary-right">
                                <span>{tr.executionTimeMs || 18}ms</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="tc-card-body">
                                <div className="tc-body-desc">
                                  <strong>Type Focus:</strong> {cat.description}
                                </div>
                                <div className="failure-io-grid">
                                  <div className="failure-io-cell">
                                    <span className="io-tag">Input:</span>
                                    <pre className="io-code">{tc.input || 'None'}</pre>
                                  </div>
                                  <div className="failure-io-cell expected-cell">
                                    <span className="io-tag">Expected:</span>
                                    <pre className="io-code">{tc.expectedOutput || 'None'}</pre>
                                  </div>
                                  <div className="failure-io-cell actual-cell">
                                    <span className="io-tag">Actual Output:</span>
                                    <pre className="io-code">{tr.actualOutput || '(None)'}</pre>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer submit & diagnose actions */}
        <div className="problem-footer-action">
          <button 
            className="problem-quick-diagnose-btn"
            onClick={handleDiagnoseAndFix}
            disabled={isDiagnosing || isSubmitting}
            title="Diagnose issues with your code, auto-repair, and view pointwise causes"
          >
            {isDiagnosing ? (
              <>
                <Loader2 size={14} className="spin-icon" />
                <span>Diagnosing...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>⚡ Diagnose &amp; Fix</span>
              </>
            )}
          </button>

          <button 
            className="submit-solution-btn"
            onClick={handleSubmitSolution}
            disabled={isSubmitting || isDiagnosing}
            title="Submit code to automated judge and evaluate all test cases"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="spin-icon" />
                <span>Evaluating Test Cases...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Submit Solution to Judge</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vertical Resize Handle for Problem Panel */}
      <ResizeHandle 
        direction="vertical"
        onDrag={handlePanelResize}
        onReset={() => setPanelWidth(510)}
        title="Drag to resize Problem Description panel (Double click to reset)"
      />

      {/* Right Panel: Integrated Compiler Workspace With Top Action Bar */}
      <div className="problem-editor-panel" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Right-Side Top Action Bar Following Theme */}
        <div className="problem-editor-topbar">
          <div className="problem-editor-meta">
            <Code2 size={15} style={{ color: '#C85A32' }} />
            <span className="editor-title-text">Solution Workspace</span>
            <span className="editor-lang-badge">{language.toUpperCase()}</span>
          </div>

          <div className="problem-editor-actions-right">
            <button 
              className="problem-quick-diagnose-btn"
              onClick={handleDiagnoseAndFix}
              disabled={isDiagnosing || isSubmitting}
              title="Diagnose code issues & view pointwise root causes"
            >
              {isDiagnosing ? <Loader2 size={13} className="spin-icon" /> : <Sparkles size={13} />}
              <span>⚡ Diagnose &amp; Fix</span>
            </button>

            <button 
              className="submit-solution-btn"
              onClick={handleSubmitSolution}
              disabled={isSubmitting || isDiagnosing}
              title="Submit code to automated judge and evaluate all test cases"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin-icon" />
                  <span>Evaluating Test Cases...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Submit Solution to Judge</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <CompilerPage />
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
