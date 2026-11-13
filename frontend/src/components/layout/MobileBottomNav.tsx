import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Terminal, Code2, Brain, Menu, X } from 'lucide-react';
import './MobileBottomNav.css';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu, isMenuOpen }) => {
  const location = useLocation();

  const isMenuRoutes = [
    '/submissions',
    '/assessments',
    '/leaderboard',
    '/analysis',
    '/ast',
    '/similarity',
    '/shortest-code',
    '/admin',
    '/profile'
  ].includes(location.pathname);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/"
        className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
        end
      >
        <div className="mobile-nav-icon-wrap">
          <LayoutDashboard size={20} />
        </div>
        <span className="mobile-nav-label">Home</span>
      </NavLink>

      <NavLink
        to="/compiler"
        className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
      >
        <div className="mobile-nav-icon-wrap">
          <Terminal size={20} />
        </div>
        <span className="mobile-nav-label">Compiler</span>
      </NavLink>

      <NavLink
        to="/problems"
        className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
      >
        <div className="mobile-nav-icon-wrap">
          <Code2 size={20} />
        </div>
        <span className="mobile-nav-label">Problems</span>
      </NavLink>

      <NavLink
        to="/ai-review"
        className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
      >
        <div className="mobile-nav-icon-wrap">
          <Brain size={20} />
        </div>
        <span className="mobile-nav-label">AI Mentor</span>
      </NavLink>

      <button
        type="button"
        className={`mobile-nav-btn ${isMenuOpen || isMenuRoutes ? 'active' : ''}`}
        onClick={onOpenMenu}
        aria-label={isMenuOpen ? 'Close Menu' : 'Open More Menu'}
      >
        <div className="mobile-nav-icon-wrap">
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </div>
        <span className="mobile-nav-label">Menu</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
