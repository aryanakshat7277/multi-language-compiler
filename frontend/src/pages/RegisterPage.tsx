import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus } from 'lucide-react';
import './RegisterPage.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, loginWithGoogle, loginWithGithub } = useAuth();
  const navigate = useNavigate();

  const formatAuthError = (err: any) => {
    const code = err?.code || '';
    const msg = err?.message || '';
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
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignUp = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGithub();
      navigate('/');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register account');
    } finally {
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
            <div>{error}</div>
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
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign up with Google</span>
          </button>

          <button 
            type="button" 
            className="btn-social-auth" 
            onClick={handleGithubSignUp}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>Sign up with GitHub</span>
          </button>
        </div>

        <div className="login-divider">
          <span>or register with email</span>
        </div>
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Display Name</label>
            <input 
              type="text" 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="John Doe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="name@example.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Create Account'}
          </button>
        </form>
        
        <div className="register-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
