import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Info, Clock, Activity, FileText } from 'lucide-react';
import { api } from '../services/api';
import { registerMonacoThemes } from '../utils/monacoThemes';
import './SubmissionDetailPage.css';

interface TestCase {
  id: string;
  testNumber: number;
  status: 'Passed' | 'Failed';
  expected: string;
  actual: string;
  time: number;
}

interface SubmissionDetail {
  id: string;
  problemId: string;
  problemTitle: string;
  language: string;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Compilation Error' | 'Runtime Error';
  score: number;
  runtime: number;
  memory: number;
  createdAt: string;
  errorOutput?: string;
  testCases?: TestCase[];
}

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      setLoading(true);
      try {
        // Mock fetch
        setTimeout(() => {
          setSubmission({
            id: id || 'sub-1',
            problemId: 'p-1',
            problemTitle: 'Two Sum',
            language: 'python',
            code: 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []',
            status: 'Wrong Answer',
            score: 75,
            runtime: 45,
            memory: 16.2,
            createdAt: new Date().toISOString(),
            testCases: [
              { id: 'tc1', testNumber: 1, status: 'Passed', expected: '[0, 1]', actual: '[0, 1]', time: 5 },
              { id: 'tc2', testNumber: 2, status: 'Passed', expected: '[1, 2]', actual: '[1, 2]', time: 4 },
              { id: 'tc3', testNumber: 3, status: 'Passed', expected: '[0, 1]', actual: '[0, 1]', time: 6 },
              { id: 'tc4', testNumber: 4, status: 'Failed', expected: '[2, 4]', actual: '[]', time: 30 },
            ]
          });
          setLoading(false);
        }, 600);
      } catch (err) {
        setError('Failed to fetch submission details');
        setLoading(false);
      }
    };

    if (id) {
      fetchSubmission();
    }
  }, [id]);

  if (loading) {
    return <div className="submission-loading"><span className="spinner"></span> Loading submission...</div>;
  }

  if (error || !submission) {
    return <div className="submission-error">{error || 'Submission not found'}</div>;
  }

  const getStatusIcon = () => {
    switch(submission.status) {
      case 'Accepted': return <CheckCircle size={28} className="status-icon success" />;
      case 'Wrong Answer': 
      case 'Runtime Error': return <XCircle size={28} className="status-icon error" />;
      case 'Time Limit Exceeded': return <Clock size={28} className="status-icon warning" />;
      case 'Compilation Error': return <AlertTriangle size={28} className="status-icon info" />;
      default: return <Info size={28} className="status-icon" />;
    }
  };

  const statusClass = submission.status.toLowerCase().replace(/ /g, '-');

  return (
    <div className="submission-detail-page">
      <div className="detail-header-nav">
        <Link to="/submissions" className="back-link">
          <ArrowLeft size={16} /> Back to Submissions
        </Link>
        <span className="submission-date">{new Date(submission.createdAt).toLocaleString()}</span>
      </div>

      <div className="detail-header-card">
        <div className="title-row">
          <h1><Link to={`/problems/${submission.problemId}`}>{submission.problemTitle}</Link></h1>
          <span className="lang-badge lg">{submission.language}</span>
        </div>

        <div className="status-banner">
          <div className="status-primary">
            {getStatusIcon()}
            <span className={`status-text ${statusClass}`}>{submission.status}</span>
          </div>
          <div className="score-display">
            Score: <span className="score-value">{submission.score}/100</span>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-item">
            <Clock size={16} className="stat-icon" />
            <span className="stat-label">Runtime:</span>
            <span className="stat-value">{submission.runtime > 0 ? `${submission.runtime} ms` : 'N/A'}</span>
          </div>
          <div className="stat-item">
            <Activity size={16} className="stat-icon" />
            <span className="stat-label">Memory:</span>
            <span className="stat-value">{submission.memory > 0 ? `${submission.memory} MB` : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="code-section">
          <h2><FileText size={18} className="section-icon" /> Source Code</h2>
          <div className="editor-container">
            <Editor
              height="400px"
              language={submission.language}
              theme="clay-light"
              beforeMount={registerMonacoThemes}
              value={submission.code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace"
              }}
            />
          </div>
        </div>

        <div className="test-cases-section">
          <h2><Activity size={18} className="section-icon" /> Test Results</h2>
          
          {submission.errorOutput ? (
            <div className="error-output">
              <h3>Compilation / Runtime Error</h3>
              <pre>{submission.errorOutput}</pre>
            </div>
          ) : submission.testCases && submission.testCases.length > 0 ? (
            <div className="test-cases-list">
              {submission.testCases.map((tc) => (
                <div key={tc.id} className={`test-case-card ${tc.status === 'Passed' ? 'passed' : 'failed'}`}>
                  <div className="tc-header">
                    <span className="tc-number">Test Case #{tc.testNumber}</span>
                    <div className="tc-meta">
                      <span className="tc-time">{tc.time} ms</span>
                      <span className={`tc-status ${tc.status.toLowerCase()}`}>
                        {tc.status === 'Passed' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {tc.status}
                      </span>
                    </div>
                  </div>
                  {tc.status === 'Failed' && (
                    <div className="tc-details">
                      <div className="tc-detail-row">
                        <span className="tc-label">Expected:</span>
                        <code className="tc-code">{tc.expected.length > 50 ? tc.expected.substring(0, 50) + '...' : tc.expected}</code>
                      </div>
                      <div className="tc-detail-row">
                        <span className="tc-label">Actual:</span>
                        <code className="tc-code">{tc.actual.length > 50 ? tc.actual.substring(0, 50) + '...' : tc.actual}</code>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-tests">No test case details available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
