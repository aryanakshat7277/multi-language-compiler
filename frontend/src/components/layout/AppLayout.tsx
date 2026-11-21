import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MessageSquarePlus } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import { CommandPalette } from '../common/CommandPalette';
import { FeedbackModal } from '../common/FeedbackModal';
import { ToastProvider } from '../../contexts/ToastContext';
import './AppLayout.css';

const AppLayout: React.FC = () => {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDefaultType, setFeedbackDefaultType] = useState<'BUG_REPORT' | 'FEATURE_REQUEST'>('BUG_REPORT');
  const location = useLocation();

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ToastProvider>
      <div className="app-layout">
        {/* Mobile Backdrop Overlay */}
        {mobileDrawerOpen && (
          <div 
            className="mobile-drawer-backdrop" 
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close menu overlay"
          />
        )}

        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileDrawerOpen}
          onCloseMobile={() => setMobileDrawerOpen(false)}
          onOpenFeedback={(type) => {
            if (type) setFeedbackDefaultType(type);
            setFeedbackOpen(true);
          }}
        />
        
        <div className="main-container">
          <Header 
            onOpenCommandPalette={() => setCmdOpen(true)} 
            collapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
            onOpenFeedback={(type) => {
              if (type) setFeedbackDefaultType(type);
              setFeedbackOpen(true);
            }}
          />
          <main className="main-content">
            <Outlet />
          </main>
        </div>

        {/* Floating Feedback & Report Action Button (Bottom-Right) */}
        <button
          className="floating-feedback-btn"
          onClick={() => {
            setFeedbackDefaultType('BUG_REPORT');
            setFeedbackOpen(true);
          }}
          title="Report an issue or suggest new features to administrators"
        >
          <MessageSquarePlus size={16} />
          <span className="feedback-btn-text">Feedback &amp; Report</span>
        </button>

        {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
        <MobileBottomNav 
          onOpenMenu={() => setMobileDrawerOpen((prev) => !prev)}
          isMenuOpen={mobileDrawerOpen}
        />

        <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

        <FeedbackModal
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          defaultType={feedbackDefaultType}
        />
      </div>
    </ToastProvider>
  );
};

export default AppLayout;
