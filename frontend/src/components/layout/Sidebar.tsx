import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Terminal, Code2, FileCheck, 
  BarChart3, GitBranch, GitCompare, Brain, Zap,
  ClipboardCheck, Trophy, User, Shield, LogOut, 
  FolderKanban
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed = false, 
  onToggleCollapse 
}) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/compiler', label: 'Compiler IDE', icon: <Terminal size={20} /> },
      ]
    },
    {
      title: 'LEARNING & PRACTICE',
      items: [
        { path: '/problems', label: 'Problem Archive', icon: <Code2 size={20} /> },
        { path: '/submissions', label: 'Submissions', icon: <FileCheck size={20} /> },
        { path: '/assessments', label: 'Assessments', icon: <ClipboardCheck size={20} /> },
        { path: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={20} /> },
      ]
    },
    {
      title: 'CODE INTELLIGENCE',
      items: [
        { path: '/analysis', label: 'Code Metrics', icon: <BarChart3 size={20} /> },
        { path: '/ast', label: 'AST Explorer', icon: <GitBranch size={20} /> },
        { path: '/similarity', label: 'Code DNA Similarity', icon: <GitCompare size={20} /> },
        { path: '/shortest-code', label: 'Shortest Code AI', icon: <Zap size={20} /> },
        { path: '/ai-review', label: 'AI Programming Mentor', icon: <Brain size={20} /> },
      ]
    },
    {
      title: 'DEVELOPER',
      items: [
        { path: '/profile', label: 'Developer Profile', icon: <User size={20} /> },
        ...(isAdmin ? [{ path: '/admin', label: 'Administration', icon: <Shield size={20} /> }] : []),
      ]
    }
  ];

  return (
    <aside className={`clay-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Navigation Groups */}
      <nav className="clay-sidebar-nav">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="sidebar-group">
            {!collapsed && (
              <div className="sidebar-group-title">{section.title}</div>
            )}
            <div className="sidebar-group-items">
              {section.items.map((item) => (
                <NavLink 
                  key={item.path} 
                  to={item.path} 
                  className={({ isActive }) => `clay-nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  end={item.path === '/'}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-item-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Pinned Card */}
      <div className="sidebar-footer-pinned">
        {user ? (
          <div className="user-clay-card">
            <div className="user-avatar-pill" style={{ overflow: 'hidden' }}>
              <img src={user?.avatarUrl || "/akshat_aryan.jpg"} alt="AKSHAT ARYAN" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {!collapsed && (
              <div className="user-text-col">
                <span className="user-name">{user.displayName || 'AKSHAT ARYAN'}</span>
                <span className="user-role-tag">{user.role?.toUpperCase() || 'LEAD ARCHITECT'}</span>
              </div>
            )}
            <button className="user-signout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="btn btn-primary sidebar-login-btn">
            {!collapsed ? 'Sign In / Register' : <User size={16} />}
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
