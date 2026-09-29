import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, 
  Search, Filter, Award, ChevronRight, FileText
} from 'lucide-react';
import { api } from '../services/api';
import './SubmissionsPage.css';

interface Submission {
  id: string;
  problemId?: string;
  problemTitle: string;
  language: string;
  verdict: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'PENDING' | string;
  score: number;
  runtimeMs: number;
  memoryKb: number;
  submittedAt: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const res = await api.get<any>('/submissions');
        const list = Array.isArray(res) ? res : (res?.data || []);
        setSubmissions(list);
      } catch {
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const filtered = submissions.filter((s) => {
    const matchesSearch = s.problemTitle.toLowerCase().includes(searchQuery.toLowerCase()) || s.language.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerdict = verdictFilter === 'ALL' || s.verdict === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  return (
    <div className="light-submissions-page page-enter">
      {/* Header Row */}
      <div className="submissions-header-row">
        <div className="submissions-title-col">
          <h1 className="submissions-heading-title">Code Executions & Submissions</h1>
          <p className="submissions-heading-subtitle">Real-time audit log of automated test evaluations and judge verdicts</p>
        </div>

        {/* Filters Group (§3.8) */}
        <div className="submissions-filters-group">
          <div className="sub-search-shell">
            <Search size={14} className="search-ico" />
            <input
              type="text"
              placeholder="Search runs by problem or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sub-search-input"
            />
          </div>

          <div className="select-wrapper">
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="light-select-field"
            >
              <option value="ALL">All Verdicts</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="WRONG_ANSWER">Wrong Answer</option>
              <option value="TIME_LIMIT_EXCEEDED">Time Limit Exceeded</option>
              <option value="COMPILATION_ERROR">Compile Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table Card (§3.7) */}
      <div className="table-card-container">
        <table className="light-data-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>#</th>
              <th>PROBLEM</th>
              <th style={{ width: '130px' }}>LANGUAGE</th>
              <th style={{ width: '180px' }}>VERDICT</th>
              <th style={{ width: '120px', textAlign: 'right' }}>SCORE</th>
              <th style={{ width: '120px', textAlign: 'right' }}>RUNTIME</th>
              <th style={{ width: '140px', textAlign: 'right' }}>SUBMITTED</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td>
                    <span className="sub-id-mono">#{idx + 1}</span>
                  </td>
                  <td>
                    <span className="sub-problem-title">{s.problemTitle}</span>
                  </td>
                  <td>
                    <span className="tag-language">{s.language}</span>
                  </td>
                  <td>
                    {s.verdict === 'ACCEPTED' && (
                      <span className="badge-pill badge-verdict-accepted">
                        <CheckCircle2 size={13} />
                        <span>Accepted</span>
                      </span>
                    )}
                    {s.verdict === 'WRONG_ANSWER' && (
                      <span className="badge-pill badge-verdict-wrong">
                        <XCircle size={13} />
                        <span>Wrong Answer</span>
                      </span>
                    )}
                    {s.verdict === 'PENDING' && (
                      <span className="badge-pill" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                        <Clock size={13} />
                        <span>Evaluating...</span>
                      </span>
                    )}
                    {s.verdict === 'TIME_LIMIT_EXCEEDED' && (
                      <span className="badge-pill badge-verdict-tle">
                        <Clock size={13} />
                        <span>TLE</span>
                      </span>
                    )}
                    {(s.verdict === 'COMPILATION_ERROR' || s.verdict === 'RUNTIME_ERROR') && (
                      <span className="badge-pill badge-verdict-error">
                        <AlertTriangle size={13} />
                        <span>Compile Error</span>
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="sub-score-wrap">
                      <Award size={13} className="sub-trophy-icon" />
                      <span className="sub-score-mono">{s.score} pts</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="sub-runtime-mono">{s.runtimeMs > 0 ? `${s.runtimeMs} ms` : '—'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="sub-submitted-date">
                      {s.submittedAt ? (s.submittedAt.includes('T') ? new Date(s.submittedAt).toLocaleDateString() : s.submittedAt) : 'Just now'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                  {loading ? 'Loading submissions...' : 'No submissions recorded yet. Execute code on any problem to begin your audit trail.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
