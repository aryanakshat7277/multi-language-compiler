import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Brain, GitCompare, Code2, ArrowUpRight, Sparkles, Flame, Zap } from 'lucide-react';
import './DashboardQuickActions.css';

export default function DashboardQuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Full-Stack Compiler IDE',
      desc: '10 Host Runtimes, Sub-50ms Direct Engine with live Monaco autocompletion.',
      icon: <Terminal size={22} />,
      badge: 'DIRECT ENGINE',
      badgeColor: 'terracotta',
      path: '/compiler',
      colorGrad: 'linear-gradient(135deg, #DE7048 0%, #C85A32 100%)',
      accentGlyph: '>_'
    },
    {
      title: 'AI Programming Mentor',
      desc: 'Instant code diagnosis, algorithmic optimization, and 6-tier fallback AI.',
      icon: <Brain size={22} />,
      badge: 'INTELLIGENCE READY',
      badgeColor: 'amber',
      path: '/ai-review',
      colorGrad: 'linear-gradient(135deg, #E08A3C 0%, #B35E17 100%)',
      accentGlyph: '⚡'
    },
    {
      title: 'Code DNA & AST Explorer',
      desc: 'Abstract Syntax Tree visualization and genetic plagiarism detection.',
      icon: <GitCompare size={22} />,
      badge: 'AST ENGINE v2',
      badgeColor: 'forest',
      path: '/similarity',
      colorGrad: 'linear-gradient(135deg, #3D7F57 0%, #2A5A3D 100%)',
      accentGlyph: '🧬'
    },
    {
      title: 'Challenge Problem Archive',
      desc: 'Curated algorithmic problems with instant multi-case test validation.',
      icon: <Code2 size={22} />,
      badge: 'DAILY STREAK',
      badgeColor: 'ochre',
      path: '/problems',
      colorGrad: 'linear-gradient(135deg, #8A532B 0%, #663914 100%)',
      accentGlyph: '🏆'
    }
  ];

  return (
    <div className="dashboard-quick-actions-card">
      <div className="quick-actions-header">
        <div className="qa-title-wrap">
          <div className="qa-header-icon-box">
            <Zap size={16} className="text-terracotta" />
          </div>
          <div>
            <h3 className="qa-title">Intelligent Workspace Command Center</h3>
            <span className="qa-subtext">Direct Host Execution, Neural AI Mentor & AST Engine Launchpad</span>
          </div>
        </div>
      </div>

      <div className="quick-actions-grid">
        {actions.map((act, idx) => (
          <motion.div
            key={idx}
            className="action-card-tile"
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(act.path)}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <div className="action-card-top">
              <div className="action-icon-circle" style={{ background: act.colorGrad }}>
                {act.icon}
              </div>
              <div className="action-badges-row">
                <span className={`action-badge ${act.badgeColor}`}>{act.badge}</span>
                <div className="action-arrow-wrap">
                  <ArrowUpRight size={15} />
                </div>
              </div>
            </div>

            <div className="action-card-text">
              <h4 className="action-title">{act.title}</h4>
              <p className="action-desc">{act.desc}</p>
            </div>

            <div className="action-card-footer">
              <span className="action-glyph">{act.accentGlyph}</span>
              <span className="action-cta">Launch Workspace &rarr;</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
