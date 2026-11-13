import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import { CommandPalette } from '../common/CommandPalette';
import { ToastProvider } from '../../contexts/ToastContext';
import './AppLayout.css';

const AppLayout: React.FC = () => {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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
        />
        
        <div className="main-container">
          <Header 
            onOpenCommandPalette={() => setCmdOpen(true)} 
            collapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          />
          <main className="main-content">
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
        <MobileBottomNav 
          onOpenMenu={() => setMobileDrawerOpen((prev) => !prev)}
          isMenuOpen={mobileDrawerOpen}
        />

        <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      </div>
    </ToastProvider>
  );
};

export default AppLayout;
