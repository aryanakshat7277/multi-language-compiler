import React, { useState, useEffect } from 'react';
import { Shield, Mail, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Tooltip } from 'recharts';
import { getCurrentUser, getMyStats, UserProfile, UserStats } from '../../services/api';
import './ProfileStatsWindow.css';

export default function ProfileStatsWindow() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [needleAngle, setNeedleAngle] = useState(-90);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser()
        .then(u => setUser(u))
        .catch(() => setUser(null));

      getMyStats()
        .then(s => {
          setStats(s);
          const pr = s.passRate || 0;
          setNeedleAngle(-90 + (pr / 100) * 180);
        })
        .catch(() => setStats(null));
    }
  }, []);

  const displayName = user?.displayName || (user ? 'Developer' : 'Loading Profile...');
  const role = user?.role || 'Developer';
  const email = user?.email || 'No email provided';
  const bio = user?.bio || 'Welcome to CodeForge PRO.';
  const memberDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';

  const problemsSolved = stats?.problemsSolved ?? 0;
  const passRate = stats?.passRate ?? 0;
  const eloRating = stats?.eloRating ?? 1200;
  const assessmentsCount = stats?.assessmentsCompleted ?? 0;
  const leaderboardPos = stats?.leaderboardRank ? `#${stats.leaderboardRank}` : 'Unranked';

  const categoryData = [
    { name: 'Easy', count: stats?.solvedBreakdown.easy ?? 0 },
    { name: 'Medium', count: stats?.solvedBreakdown.medium ?? 0 },
    { name: 'Hard', count: stats?.solvedBreakdown.hard ?? 0 },
  ];

  const strokeDashoffset = 172 - (passRate / 100) * 172;

  return (
    <div className="profile-stats-window-container">
      {/* 1. Hero Wood Grain Banner Card */}
      <div className="wood-grain-profile-card">
        <div className="profile-avatar-box">
          <img 
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=c85a32,2a5a3d,b35e17`} 
            alt={displayName} 
            className="avatar-img"
          />
        </div>

        <div className="profile-content-col">
          <div className="profile-top-name-row">
            <h2 className="user-name-hero">{displayName}</h2>
            <span className="pill-student">{role}</span>
          </div>

          <p className="user-motto-quote">
            {bio}
          </p>

          <div className="user-meta-sub-row">
            <span className="u-meta-item"><Mail size={12} /> {email}</span>
            <span className="u-meta-item"><Calendar size={12} /> Member since {memberDate}</span>
          </div>
        </div>
      </div>

      {/* 2. Modular Stats Grid (5 Cards) */}
      <div className="stats-modules-grid">
        {/* Card 1: Total Problems Solved with breakdown */}
        <div className="clay-panel stat-tile-card problems-tile">
          <span className="tile-title">Total Problems Solved</span>
          <div className="tile-number-big">{problemsSolved}</div>

          <div className="tile-mini-barchart">
            <ResponsiveContainer width="100%" height={32}>
              <BarChart data={categoryData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <Bar dataKey="count" fill="#4C7A5D" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <span className="tile-sublabel-caption">E: {categoryData[0].count} | M: {categoryData[1].count} | H: {categoryData[2].count}</span>
        </div>

        {/* Card 2: Submissions (Success %) with Speedometer Gauge */}
        <div className="clay-panel stat-tile-card speedometer-tile">
          <span className="tile-title">Submission Success</span>

          <div className="speedometer-inner-layout">
            <div className="speedometer-gauge-wrapper">
              <svg className="speedometer-svg" viewBox="0 0 140 75" width="95" height="55">
                <path
                  d="M 15 65 A 55 55 0 0 1 125 65"
                  fill="none"
                  stroke="#E4D9CE"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 15 65 A 55 55 0 0 1 125 65"
                  fill="none"
                  stroke="url(#terracottaGaugeGrad)"
                  strokeWidth="10"
                  strokeDasharray="172"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="terracottaGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4C7A5D" />
                    <stop offset="50%" stopColor="#E08A3C" />
                    <stop offset="100%" stopColor="#C85A32" />
                  </linearGradient>
                </defs>
                <circle cx="70" cy="65" r="5" fill="#7A4222" />
                <line
                  x1="70"
                  y1="65"
                  x2="70"
                  y2="24"
                  stroke="#7A4222"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '70px 65px',
                    transform: `rotate(${needleAngle}deg)`,
                    transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                />
              </svg>
            </div>

            <div className="speedometer-val-col">
              <span className="speedometer-pct">{passRate}%</span>
              <span className="speedometer-sub">PASS RATE</span>
            </div>
          </div>
        </div>

        {/* Card 3: Global Rank */}
        <div className="clay-panel stat-tile-card rank-tile">
          <span className="tile-title">Global Rank (Elo)</span>
          <div className="tile-number-big text-ochre">{eloRating}</div>
          <span className="tile-sublabel-caption">{problemsSolved > 0 ? 'ACTIVE RATING' : 'PROVISIONAL'}</span>
        </div>

        {/* Card 4: Assessments Completed */}
        <div className="clay-panel stat-tile-card assessment-crest-tile">
          <div className="bronze-shield-icon-box">
            <Shield size={20} className="shield-icon" />
          </div>
          <div className="crest-details-col">
            <span className="crest-title">Assessments Completed</span>
            <div className="crest-count-big">{assessmentsCount}</div>
            <span className="crest-sub">ASSESSMENTS</span>
          </div>
        </div>

        {/* Card 5: Leaderboard Pos */}
        <div className="clay-panel stat-tile-card leaderboard-pos-tile">
          <span className="tile-title">Leaderboard Pos</span>
          <div className="tile-number-big text-charcoal">{leaderboardPos}</div>
          <span className="tile-sublabel-caption">GLOBAL STANDING</span>
        </div>
      </div>
    </div>
  );
}
