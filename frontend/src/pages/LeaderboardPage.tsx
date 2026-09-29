import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Search, Filter } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './LeaderboardPage.css';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  problemsSolved: number;
  totalSubmissions: number;
  successRate: number;
  score: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all-time');
  
  const currentUserId = user?.id;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError('');
      try {
        const realUsers = await api.get<LeaderboardUser[]>('/leaderboard');
        if (Array.isArray(realUsers)) {
          setUsers(realUsers);
        } else {
          setUsers([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load leaderboard');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeFilter]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderRank = (rank: number) => {
    if (rank === 1) return <div className="rank-badge gold"><Trophy size={16} /></div>;
    if (rank === 2) return <div className="rank-badge silver"><Medal size={16} /></div>;
    if (rank === 3) return <div className="rank-badge bronze"><Medal size={16} /></div>;
    return <span className="rank-number">{rank}</span>;
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <div className="header-title">
          <Trophy className="header-icon" size={32} />
          <div>
            <h1>Global Leaderboard</h1>
            <p>See how you stack up against other developers.</p>
          </div>
        </div>

        <div className="leaderboard-controls">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-box">
            <Filter size={18} className="filter-icon" />
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all-time">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner"></span>
          <p>Loading rankings...</p>
        </div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <div className="table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Problems Solved</th>
                <th>Submissions</th>
                <th>Success Rate</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`${user.rank <= 3 ? 'top-three' : ''} ${user.id === currentUserId ? 'current-user' : ''}`}
                  >
                    <td className="col-rank">{renderRank(user.rank)}</td>
                    <td className="col-user">
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="user-name">{user.name} {user.id === currentUserId && <span className="you-badge">You</span>}</span>
                      </div>
                    </td>
                    <td>{user.problemsSolved}</td>
                    <td>{user.totalSubmissions}</td>
                    <td>{user.successRate}%</td>
                    <td className="col-score">{user.score.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-state">No users found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
