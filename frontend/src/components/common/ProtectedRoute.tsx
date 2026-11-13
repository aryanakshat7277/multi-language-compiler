import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#120f0d',
        color: '#f5ebe1',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}>
        <Loader2 
          size={38} 
          style={{ 
            color: '#d9653b', 
            marginBottom: '16px', 
            animation: 'cf-spin 1s linear infinite' 
          }} 
        />
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>
          CodeForge Pro
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#a89a90' }}>
          Verifying session credentials...
        </p>
        <style>{`
          @keyframes cf-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
