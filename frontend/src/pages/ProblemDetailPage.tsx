import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Award, CheckCircle2, AlertCircle, 
  Send, Brain, FileText, CheckSquare, Sparkles, Loader2 
} from 'lucide-react';
import CompilerPage from './CompilerPage';
import ResizeHandle from '../components/common/ResizeHandle';
import { api } from '../services/api';
import { useEditorStore } from '../stores/editorStore';
import { useToast } from '../contexts/ToastContext';
import './ProblemDetailPage.css';

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
  const [panelWidth, setPanelWidth] = useState(510);

  const handlePanelResize = (delta: number) => {
    setPanelWidth(prev => Math.max(300, Math.min(850, prev + delta)));
  };

  const { files, language } = useEditorStore();
  const { showToast } = useToast();

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

  const handleSubmitSolution = async () => {
    if (!problem) return;
    setIsSubmitting(true);
    setSubmissionResult(null);
    showToast('Submitting solution to automated judge...', 'info');

    try {
      const codeFiles = files.map(f => ({ filename: f.name, content: f.content }));
      const payload = {
        problemId: problem.id,
        languageId: language,
        files: codeFiles
      };

      const res = await api.post('/submissions', payload);
      showToast('Solution submitted! Evaluating test cases...', 'info');

      // Poll for evaluation result
      setTimeout(async () => {
        try {
          const detail = await api.get(`/submissions/${res.submissionId}`);
          setSubmissionResult(detail);
          if (detail.status === 'ACCEPTED' || detail.status === 'SUCCESS') {
            showToast('✓ Solution Accepted! Full points awarded.', 'success');
          } else {
            showToast(`Submission evaluated: ${detail.status}`, 'warning');
          }
          setActiveTab('submissions');
        } catch {
          // ignore
        } finally {
          setIsSubmitting(false);
        }
      }, 1500);

    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
      setIsSubmitting(false);
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
            {submissionResult && (
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

          {activeTab === 'submissions' && submissionResult && (
            <div className="submission-result-view">
              <div className={`verdict-banner ${submissionResult.status === 'ACCEPTED' || submissionResult.status === 'SUCCESS' ? 'verdict-success' : 'verdict-error'}`}>
                {submissionResult.status === 'ACCEPTED' || submissionResult.status === 'SUCCESS' ? (
                  <>
                    <CheckCircle2 size={24} />
                    <div>
                      <div className="verdict-title">ACCEPTED</div>
                      <div className="verdict-sub">All test cases passed successfully</div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={24} />
                    <div>
                      <div className="verdict-title">{submissionResult.status}</div>
                      <div className="verdict-sub">Solution failed evaluation checks</div>
                    </div>
                  </>
                )}
              </div>

              <div className="result-details-box">
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
                {submissionResult.errorOutput && (
                  <div className="res-error-box">
                    <div className="err-title">Compilation / Runtime Trace:</div>
                    <pre className="err-code">{submissionResult.errorOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer submit action */}
        <div className="problem-footer-action">
          <button 
            className="submit-solution-btn"
            onClick={handleSubmitSolution}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="spin-icon" />
                <span>Evaluating...</span>
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

      {/* Right Panel: Integrated Compiler Workspace */}
      <div className="problem-editor-panel" style={{ flex: 1, minWidth: 0 }}>
        <CompilerPage />
      </div>
    </div>
  );
};

export default ProblemDetailPage;
