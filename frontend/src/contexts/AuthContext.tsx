import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  auth,
  onAuthStateChanged,
  getRedirectResult,
  signInWithGoogle, 
  signInWithGoogleRedirect,
  signInWithGithub, 
  signInWithFirebaseEmail, 
  signUpWithFirebaseEmail, 
  signOutFirebase,
  isFirebaseConfigured 
} from '../config/firebase';

export interface User {
  id: string;
  email: string;
  role: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  isAdmin: boolean;
  isInstructor: boolean;
  isFirebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithFirebaseEmail: (email: string, password: string) => Promise<void>;
  registerWithFirebaseEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncFirebaseUser = async (firebaseUser: any) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await api.post<{ token: string; user?: User }>('/auth/firebase', { idToken });
      if (res && res.token) {
        localStorage.setItem('token', res.token);
      }
      const userData = res.user || await api.get<User>('/auth/me');
      setUser(userData);
    } catch (err) {
      console.warn('Backend sync failed, falling back to Firebase user profile:', err);
      // Fallback: use Firebase user directly so the user is never kicked to login if backend has network lag
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Developer'),
        role: firebaseUser.email?.toLowerCase() === 'aryanakshat7277@gmail.com' ? 'ADMIN' : 'STUDENT',
        avatarUrl: firebaseUser.photoURL || undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check for redirect results if user came back from Google accounts redirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          await syncFirebaseUser(result.user);
        }
      })
      .catch((err) => {
        console.warn('getRedirectResult notice:', err);
      });

    // 2. Primary listener: onAuthStateChanged maintains persistent Google/Firebase sessions
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await syncFirebaseUser(fbUser);
      } else {
        // If not authenticated via Firebase, check if an existing backend JWT token exists in localStorage
        const token = localStorage.getItem('token');
        if (token) {
          api.get<User>('/auth/me')
            .then((userData) => {
              setUser(userData);
            })
            .catch(() => {
              localStorage.removeItem('token');
              setUser(null);
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string }>('/auth/login', { email, password });
    localStorage.setItem('token', res.token);
    const userData = await api.get<User>('/auth/me');
    setUser(userData);
    setIsLoading(false);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await api.post<{ token: string }>('/auth/register', { email, password, displayName });
    localStorage.setItem('token', res.token);
    const userData = await api.get<User>('/auth/me');
    setUser(userData);
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    const fbUser = await signInWithGoogle();
    if (fbUser) {
      await syncFirebaseUser(fbUser);
    }
  };

  const loginWithGoogleRedirect = async () => {
    await signInWithGoogleRedirect();
  };

  const loginWithGithub = async () => {
    const fbUser = await signInWithGithub();
    if (fbUser) {
      await syncFirebaseUser(fbUser);
    }
  };

  const loginWithFirebaseEmail = async (email: string, password: string) => {
    const fbUser = await signInWithFirebaseEmail(email, password);
    await syncFirebaseUser(fbUser);
  };

  const registerWithFirebaseEmail = async (email: string, password: string, displayName: string) => {
    const fbUser = await signUpWithFirebaseEmail(email, password, displayName);
    await syncFirebaseUser(fbUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsLoading(false);
    signOutFirebase().catch(() => {});
  };

  const role = user?.role?.toUpperCase() || '';
  const isMasterAdmin = user?.email?.toLowerCase() === 'aryanakshat7277@gmail.com';

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      isLoading,
      user,
      isAdmin: isMasterAdmin,
      isInstructor: isMasterAdmin || role === 'INSTRUCTOR' || role === 'ADMIN',
      isFirebaseReady: isFirebaseConfigured,
      login,
      register,
      loginWithGoogle,
      loginWithGoogleRedirect,
      loginWithGithub,
      loginWithFirebaseEmail,
      registerWithFirebaseEmail,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
