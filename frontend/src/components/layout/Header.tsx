import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Sparkles, Bell, ChevronLeft, Maximize2, Minimize2
} from 'lucide-react';
import './Header.css';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onOpenCommandPalette, 
  collapsed = false, 
  onToggleSidebar 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const getPageBreadcrumb = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/compiler': return 'Compiler IDE';
      case '/problems': return 'Problem Archive';
      case '/submissions': return 'Submissions';
      case '/assessments': return 'Assessments';
      case '/leaderboard': return 'Leaderboard';
      case '/analysis': return 'Code Metrics';
      case '/ast': return 'AST Explorer';
      case '/similarity': return 'Code DNA';
      case '/ai-review': return 'AI Programming Mentor';
      case '/profile': return 'Developer Profile';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="clay-top-bar">
      {/* Left: Brand + Breadcrumb */}
      <div className="top-bar-left">
        <div className="brand-identity-lockup" onClick={() => navigate('/')}>
          <div className="brand-wood-square">
            <span className="brand-glyph">&gt;_</span>
          </div>
          <div className="brand-text-col">
            <div className="brand-row">
              <span className="brand-name">CodeForge</span>
              <span className="brand-pro-tag">PRO v2.5</span>
            </div>
            <span className="breadcrumb-path">&gt; {getPageBreadcrumb()}</span>
          </div>
        </div>

        {onToggleSidebar && (
          <button 
            className={`collapse-toggle-btn ${collapsed ? 'is-collapsed' : ''}`}
            onClick={onToggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Center: Search Input */}
      <div className="top-bar-center">
        <button 
          className="clay-search-bar" 
          onClick={onOpenCommandPalette}
          title="Quick Search or Run Actions (Ctrl + K)"
        >
          <Search size={16} className="search-ico" />
          <span className="search-ph">Quick Search or Run Actions...</span>
          <kbd className="cmd-k-badge">Ctrl + K</kbd>
        </button>
      </div>

      {/* Right: Direct Engine, AI Intelligence & Fullscreen Toggle */}
      <div className="top-bar-right">
        <button
          className={`fullscreen-toggle-btn ${isFullscreen ? 'active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Full Screen Mode (Esc)" : "Enter Full Screen Mode (F11)"}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          <span className="fs-btn-text">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
        </button>

        <div 
          className="floating-status-pill pill-engine" 
          onClick={() => navigate('/compiler')}
          title="Host Direct Engine Online"
        >
          <span className="pulse-dot-terracotta" />
          <span>Direct Engine</span>
        </div>

        <div 
          className="floating-status-pill pill-ai" 
          onClick={() => navigate('/ai-review')}
          title="AI Intelligence Ready"
        >
          <span className="pulse-dot-amber" />
          <Sparkles size={14} className="sparkle-ico" />
          <span>AI Intelligence</span>
        </div>

        <button 
          className="bell-ghost-btn" 
          title="Notifications" 
          onClick={() => navigate('/submissions')}
        >
          <Bell size={18} />
          <span className="bell-badge-dot" />
        </button>
      </div>
    </header>
  );
};

export default Header;
