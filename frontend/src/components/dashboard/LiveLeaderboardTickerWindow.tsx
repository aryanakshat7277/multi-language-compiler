import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Flame, Star, Sparkles, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import './LiveLeaderboardTickerWindow.css';

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

export default function LiveLeaderboardTickerWindow() {
  const [roster, setRoster] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get<LeaderboardUser[]>('/leaderboard')
      .then(data => {
        if (active && Array.isArray(data)) {
          // Strictly show non-admin real users
          const filtered = data.filter(u => !u.name?.toLowerCase().includes('admin'));
          setRoster(filtered);
        }
      })
      .catch(() => {
        if (active) setRoster([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const getRankMedal = (idx: number) => {
    if (idx === 0) return { label: '🥇 GOLD', bg: 'gold-medal', color: '#B35E17' };
    if (idx === 1) return { label: '🥈 SILVER', bg: 'silver-medal', color: '#7A7A7A' };
    if (idx === 2) return { label: '🥉 BRONZE', bg: 'bronze-medal', color: '#8A532B' };
    return { label: `#${idx + 1}`, bg: 'standard-rank', color: '#C85A32' };
  };

  return (
    <div className="leaderboard-ticker-card">
      <div className="ticker-header">
        <div className="ticker-title-wrap">
          <div className="trophy-pulse-wrap">
            <Trophy size={18} style={{ color: '#C85A32' }} />
          </div>
          <div>
            <h3 className="ticker-title">Team Leaderboard & Active Contributors</h3>
            <span className="ticker-subtext">Verified Rank & Compiler Submissions Ledger</span>
          </div>
        </div>
        <div className="ticker-header-right">
          <div className="live-activity-beacon">
            <span className="beacon-pulse" />
            <span className="beacon-label">Live Roster</span>
          </div>
          <span className="rank-badge-pill">{roster.length} Active {roster.length === 1 ? 'Contributor' : 'Contributors'}</span>
        </div>
      </div>

      <div className="ticker-grid">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8B5A2B', fontSize: '13px' }}>
            Loading live leaderboard standings...
          </div>
        ) : roster.length > 0 ? (
          roster.map((dev, idx) => {
            const medal = getRankMedal(idx);
            const nextTierTarget = Math.max(1000, Math.ceil(dev.score / 500) * 500);
            const xpPercent = Math.min(100, Math.round((dev.score / nextTierTarget) * 100));

            return (
              <motion.div 
                key={dev.id || idx}
                className={`dev-card-row ${idx === 0 ? 'lead-developer' : ''}`}
                whileHover={{ scale: 1.02, y: -3 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              >
                <div className="dev-card-top-row">
                  <div className={`dev-rank-badge ${medal.bg}`}>
                    {medal.label}
                  </div>

                  <div className="dev-avatar-wrap">
                    <img 
                      src={dev.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dev.name)}&backgroundColor=c85a32,2a5a3d,b35e17`} 
                      alt={dev.name} 
                      className="dev-img" 
                    />
                  </div>

                  <div className="dev-details">
                    <div className="dev-name-row">
                      <strong className="dev-name">{dev.name}</strong>
                      {idx === 0 && <span className="lead-tag">CHAMPION</span>}
                    </div>
                    <span className="dev-role">{dev.successRate}% Acceptance</span>
                  </div>

                  <div className="dev-stats-right">
                    <div className="dev-points">{dev.score.toLocaleString()} PTS</div>
                    <div className="dev-solved">{dev.problemsSolved} Solved</div>
                  </div>
                </div>

                {/* Animated XP Progression Bar */}
                <div className="dev-xp-bar-wrap">
                  <div className="dev-xp-header">
                    <span className="xp-tier-label">Rank Tier Progress</span>
                    <span className="xp-percent-label">{xpPercent}%</span>
                  </div>
                  <div className="dev-xp-track">
                    <div 
                      className={`dev-xp-fill ${idx === 0 ? 'gold' : ''}`}
                      style={{ width: `${xpPercent}%` }} 
                    />
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8B5A2B', fontSize: '13px' }}>
            No verified student submissions yet. Solve problems in the compiler to rank on the live leaderboard!
          </div>
        )}
      </div>
    </div>
  );
}
