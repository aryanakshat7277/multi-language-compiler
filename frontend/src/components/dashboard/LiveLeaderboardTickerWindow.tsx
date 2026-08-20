import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Flame, Star, CheckCircle2 } from 'lucide-react';
import './LiveLeaderboardTickerWindow.css';

const TEAM_ROSTER = [
  { rank: 1, name: 'AKSHAT ARYAN', role: 'Lead Architect', points: 9840, solved: 243, avatar: '/akshat_aryan.jpg', isLead: true },
  { rank: 2, name: 'WARISH KHAN', role: 'Core Contributor', points: 8910, solved: 215, avatar: '', isLead: false },
  { rank: 3, name: 'ARUN DEV', role: 'Compiler Specialist', points: 8250, solved: 198, avatar: '', isLead: false },
  { rank: 4, name: 'MOHIT', role: 'AI Engine Specialist', points: 7680, solved: 184, avatar: '', isLead: false },
  { rank: 5, name: 'AQUIB', role: 'Security Lead', points: 7120, solved: 172, avatar: '', isLead: false },
  { rank: 6, name: 'ABHAY', role: 'Performance Engineer', points: 6890, solved: 165, avatar: '', isLead: false },
];

export default function LiveLeaderboardTickerWindow() {
  return (
    <div className="leaderboard-ticker-card">
      <div className="ticker-header">
        <div className="ticker-title-wrap">
          <Trophy size={18} style={{ color: '#C85A32' }} />
          <div>
            <h3 className="ticker-title">Team Leaderboard & Active Contributors</h3>
            <span className="ticker-subtext">Verified Rank & Compiler Submissions Ledger</span>
          </div>
        </div>
        <span className="rank-badge-pill">6 Core Developers</span>
      </div>

      <div className="ticker-grid">
        {TEAM_ROSTER.map(dev => (
          <motion.div 
            key={dev.rank}
            className={`dev-card-row ${dev.isLead ? 'lead-developer' : ''}`}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="dev-rank-circle">#{dev.rank}</div>
            
            <div className="dev-avatar-wrap">
              {dev.avatar ? (
                <img src={dev.avatar} alt={dev.name} className="dev-img" />
              ) : (
                <div className="dev-avatar-fallback">{dev.name.charAt(0)}</div>
              )}
            </div>

            <div className="dev-details">
              <div className="dev-name-row">
                <strong className="dev-name">{dev.name}</strong>
                {dev.isLead && <span className="lead-tag">RANK #1</span>}
              </div>
              <span className="dev-role">{dev.role}</span>
            </div>

            <div className="dev-stats-right">
              <div className="dev-points">{dev.points.toLocaleString()} PTS</div>
              <div className="dev-solved">{dev.solved} Solved</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
