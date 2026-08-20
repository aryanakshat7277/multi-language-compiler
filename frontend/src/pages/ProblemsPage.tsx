import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, ChevronRight, Award, Circle, CheckCircle2, SlidersHorizontal
} from 'lucide-react';
import { api } from '../services/api';
import './ProblemsPage.css';

interface Problem {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category?: string;
  timeLimit: number;
  memoryLimit: number;
  acceptanceRate?: number;
  points?: number;
  solved?: boolean;
}

const FALLBACK_PROBLEMS: Problem[] = [
  { id: 'two-sum', title: 'Two Sum', difficulty: 'EASY', category: 'Arrays & Hashing', timeLimit: 2000, memoryLimit: 128, acceptanceRate: 88, points: 100, solved: true },
  { id: 'stumbles-prediction', title: 'Number of Islands & Graph Cycles', difficulty: 'MEDIUM', category: 'Graphs & BFS', timeLimit: 2000, memoryLimit: 128, acceptanceRate: 59, points: 200, solved: false },
  { id: 'conoution-sut-freds', title: 'LRU Cache & Memory Page Replacement', difficulty: 'MEDIUM', category: 'Linked Lists & Hash', timeLimit: 2000, memoryLimit: 128, acceptanceRate: 68, points: 250, solved: false },
  { id: 'encorting-exriad-temy', title: 'Median of Two Sorted Arrays', difficulty: 'HARD', category: 'Binary Search', timeLimit: 3000, memoryLimit: 256, acceptanceRate: 42, points: 400, solved: false },
  { id: 'the-suelley', title: 'Trapping Rain Water', difficulty: 'HARD', category: 'Two Pointers & Stack', timeLimit: 2000, memoryLimit: 128, acceptanceRate: 45, points: 350, solved: false },
  { id: 'elemanic-ficiens-rd', title: 'Valid Anagram & Frequency Map', difficulty: 'EASY', category: 'Hash Table', timeLimit: 1000, memoryLimit: 128, acceptanceRate: 93, points: 100, solved: true },
  { id: 'stavite-combin-archivs', title: 'Merge k Sorted Linked Lists', difficulty: 'HARD', category: 'Heap / Priority Queue', timeLimit: 3000, memoryLimit: 256, acceptanceRate: 48, points: 350, solved: false },
  { id: 'two-zum-ecrtee', title: 'Valid Parentheses & Bracket Matching', difficulty: 'EASY', category: 'Stack', timeLimit: 1000, memoryLimit: 128, acceptanceRate: 91, points: 100, solved: false },
];

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>(FALLBACK_PROBLEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await api.get('/problems');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setProblems(res.data);
        }
      } catch {
        // keep fallback
      }
    };
    fetchProblems();
  }, []);

  const categories = ['ALL', 'Arrays & Hashing', 'Linked Lists & Hash', 'Binary Search', 'Two Pointers & Stack', 'Hash Table', 'Heap / Priority Queue', 'Stack', 'Graphs & BFS'];

  const filtered = problems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = difficultyFilter === 'ALL' || p.difficulty?.toUpperCase() === difficultyFilter;
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesDiff && matchesCat;
  });

  const easyCount = problems.filter(p => p.difficulty === 'EASY').length;
  const mediumCount = problems.filter(p => p.difficulty === 'MEDIUM').length;
  const hardCount = problems.filter(p => p.difficulty === 'HARD').length;

  return (
    <div className="light-problems-page page-enter">
      {/* Header Row */}
      <div className="problems-header-row">
        <div className="problems-title-col">
          <h1 className="problems-heading-title">Algorithm Problem Archive</h1>
          <p className="problems-heading-subtitle">Automated judge evaluation with strict time & memory limits across 8 languages</p>
        </div>

        {/* Three Summary Pills (§3.4) */}
        <div className="difficulty-summary-pills-row">
          <span className="badge-diff-easy">Easy: {easyCount}</span>
          <span className="badge-diff-medium">Medium: {mediumCount}</span>
          <span className="badge-diff-hard">Hard: {hardCount}</span>
        </div>
      </div>

      {/* Filter Controls Bar (§3.8) */}
      <div className="problems-filter-bar">
        <div className="problems-search-input-shell">
          <Search size={15} className="search-filter-icon" />
          <input
            type="text"
            placeholder="Search problems by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="problems-search-field"
          />
        </div>

        <div className="dropdown-filters-group">
          <div className="select-wrapper">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="light-select-field"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="light-select-field"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Problems Table Card (§3.7) */}
      <div className="table-card-container">
        <table className="light-data-table">
          <thead>
            <tr>
              <th style={{ width: '56px', textAlign: 'center' }}>STATUS</th>
              <th>PROBLEM TITLE</th>
              <th style={{ width: '180px' }}>CATEGORY</th>
              <th style={{ width: '130px' }}>DIFFICULTY</th>
              <th style={{ width: '160px' }}>ACCEPTANCE</th>
              <th style={{ width: '120px', textAlign: 'right' }}>POINTS</th>
              <th style={{ width: '120px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const diff = (p.difficulty || 'EASY').toUpperCase();
              return (
                <tr 
                  key={p.id || idx}
                  className="clickable-table-row"
                  onClick={() => navigate(`/problems/${p.id}`)}
                >
                  <td style={{ textAlign: 'center' }}>
                    {p.solved ? (
                      <CheckCircle2 size={18} className="status-solved-icon" />
                    ) : (
                      <Circle size={18} className="status-unsolved-ring" />
                    )}
                  </td>
                  <td>
                    <div className="problem-title-cell">
                      <span className="problem-main-name">{p.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className="problem-category-text">{p.category || 'Algorithms'}</span>
                  </td>
                  <td>
                    {diff === 'EASY' && <span className="badge-diff-easy">Easy</span>}
                    {diff === 'MEDIUM' && <span className="badge-diff-medium">Medium</span>}
                    {diff === 'HARD' && <span className="badge-diff-hard">Hard</span>}
                  </td>
                  <td>
                    <div className="acceptance-cell-wrap">
                      <div className="acceptance-track">
                        <div className="acceptance-fill" style={{ width: `${p.acceptanceRate || 75}%` }} />
                      </div>
                      <span className="acceptance-num-mono">{p.acceptanceRate || 75}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="points-cell-wrap">
                      <Award size={14} className="points-trophy-icon" />
                      <span className="points-value-mono">{p.points || 100} pts</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary btn-sm btn-solve-row"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/problems/${p.id}`);
                      }}
                    >
                      <span>Solve</span>
                      <ChevronRight size={14} className="solve-chevron-arrow" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
