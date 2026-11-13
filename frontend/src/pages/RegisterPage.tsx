import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, AlertCircle, ArrowRight } from 'lucide-react';
import './RegisterPage.css';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  
  const { loginWithGoogle, loginWithGoogleRedirect, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated and not loading, navigate immediately into the app (never redirect to /login)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const rawFrom = (location.state as any)?.from?.pathname;
      const target = (rawFrom && rawFrom !== '/login' && rawFrom !== '/register') ? rawFrom : '/';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  const formatAuthError = (err: any) => {
    const code = err?.code || '';
    const msg = err?.message || '';
    if (code === 'auth/popup-blocked') {
      setPopupBlocked(true);
      return 'Your browser blocked the sign-up popup. Allow popups for this site, or use the direct redirect button below.';
    }
    if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
      const host = window.location.hostname;
      if (host === '127.0.0.1') {
        return `Domain "127.0.0.1" is not authorized in Firebase. Firebase requires "localhost" instead.`;
      }
      return `Domain "${host}" is not authorized for OAuth in Firebase. Please add "${host}" to Firebase Console (codeforge-a) > Authentication > Settings > Authorized domains.`;
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-up popup was closed before completing. Please try again.';
    }
    return msg || 'Authentication failed';
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setPopupBlocked(false);
    setLoading(true);
    try {
      await loginWithGoogle();
      const rawFrom = (location.state as any)?.from?.pathname;
      const target = (rawFrom && rawFrom !== '/login' && rawFrom !== '/register') ? rawFrom : '/';
      navigate(target, { replace: true });
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectSignUp = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogleRedirect();
    } catch (err: any) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  };

  const isLocalIp = window.location.hostname === '127.0.0.1';

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <UserPlus size={40} className="register-icon" />
          <h2>CodeForge</h2>
          <p>Create a new account</p>
        </div>
        
        {error && (
          <div className="register-error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <AlertCircle size={16} />
              <strong style={{ fontSize: '13px' }}>Authentication Alert</strong>
            </div>
            <div>{error}</div>

            {popupBlocked && (
              <div style={{ marginTop: '10px', fontSize: '12px', background: 'rgba(0,0,0,0.04)', padding: '8px', borderRadius: '6px' }}>
                💡 <b>Quick Fix:</b> Click the <b>Pop-up blocked icon</b> in the right corner of your Chrome URL bar and select <i>"Always allow pop-ups"</i>.
              </div>
            )}

            {isLocalIp && (
              <div style={{ marginTop: '8px' }}>
                <a 
                  href={`http://localhost:${window.location.port || '5173'}${window.location.pathname}`}
                  style={{ color: '#A63B19', fontWeight: 800, textDecoration: 'underline' }}
                >
                  ➜ Click here to open via http://localhost:{window.location.port || '5173'}
                </a>
              </div>
            )}
            {!isLocalIp && error.includes('Authorized domains') && (
              <div style={{ marginTop: '8px' }}>
                <a 
                  href="https://console.firebase.google.com/project/codeforge-a/authentication/settings" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#A63B19', fontWeight: 800, textDecoration: 'underline' }}
                >
                  ➜ Open Firebase Console Authorized Domains Settings
                </a>
              </div>
            )}
          </div>
        )}

        {/* Social Authentication */}
        <div className="social-auth-buttons">
          <button 
            type="button" 
            className="btn-social-auth" 
            onClick={handleGoogleSignUp}
            disabled={loading || isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{loading ? 'Connecting...' : 'Sign up with Google'}</span>
          </button>

          {popupBlocked && (
            <button
              type="button"
              className="btn-social-auth"
              onClick={handleRedirectSignUp}
              style={{
                marginTop: '10px',
                background: '#4a2511',
                color: '#fff',
                borderColor: '#4a2511'
              }}
              disabled={loading}
            >
              <span>Sign up via Full-Page Redirect</span>
              <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
