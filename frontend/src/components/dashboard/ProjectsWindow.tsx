import React from 'react';
import { FolderKanban, GitPullRequest, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ProjectsWindow.css';

export default function ProjectsWindow() {
  const navigate = useNavigate();

  return (
    <div className="clay-panel projects-collab-window-panel">
      {/* Header */}
      <div className="projects-window-header">
        <div className="projects-header-left">
          <FolderKanban size={14} className="text-terracotta" />
          <span className="projects-window-title">Project Collaboration</span>
        </div>

        <button 
          className="btn btn-ghost btn-sm view-all-link"
          onClick={() => navigate('/problems')}
        >
          <span>View All</span>
          <ArrowUpRight size={12} />
        </button>
      </div>

      {/* Grid of Team Projects and Integration Notifications */}
      <div className="projects-content-grid">
        {/* Team Priority Card 1: AKSHAT ARYAN & WARISH KHAN */}
        <div className="clay-panel project-card" onClick={() => navigate('/leaderboard')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="p-title">Team Leaderboard</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#C85A32', background: '#FBECE6', padding: '2px 6px', borderRadius: 4 }}>TOP RANKED</span>
          </div>
          <span className="p-subtext" style={{ fontWeight: 800, color: '#150E0B' }}>AKSHAT ARYAN (Lead Architect)</span>
          <span className="p-merge-label">WARISH KHAN (Core Contributor)</span>

          <div className="p-avatars-row" style={{ marginTop: 8 }}>
            <img src="/akshat_aryan.jpg" alt="AKSHAT ARYAN" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #C85A32' }} />
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C85A32', color: '#FAF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>WK</div>
            <span className="p-avatar-more">+4 Team</span>
          </div>
        </div>

        {/* Team Priority Card 2: ARUN DEV & MOHIT */}
        <div className="clay-panel project-card" onClick={() => navigate('/submissions')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="p-title">Active Submissions</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#2A5A3D', background: '#EBF4EF', padding: '2px 6px', borderRadius: 4 }}>VERIFIED</span>
          </div>
          <span className="p-subtext" style={{ fontWeight: 800, color: '#150E0B' }}>ARUN DEV (Compiler Eng.)</span>
          <span className="p-merge-label">MOHIT (AI Engine Spec.)</span>

          <div className="p-avatars-row" style={{ marginTop: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#B35E17', color: '#FAF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>AD</div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2A5A3D', color: '#FAF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>MO</div>
            <span className="p-avatar-more">+2 Team</span>
          </div>
        </div>

        {/* Team Priority Card 3: AQUIB & ABHAY */}
        <div className="clay-panel notifications-well-card" onClick={() => navigate('/leaderboard')} style={{ cursor: 'pointer' }}>
          <span className="notif-heading">Core Contributors</span>

          <div className="notif-items-list">
            <div className="notif-item">
              <div className="notif-ico-box">
                <GitPullRequest size={12} />
              </div>
              <div className="notif-text-col">
                <span className="notif-name">AQUIB (Security & AST)</span>
                <span className="notif-time">Verified #5</span>
              </div>
            </div>

            <div className="notif-item">
              <div className="notif-ico-box">
                <GitPullRequest size={12} />
              </div>
              <div className="notif-text-col">
                <span className="notif-name">ABHAY (Perf. Engineer)</span>
                <span className="notif-time">Verified #6</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
