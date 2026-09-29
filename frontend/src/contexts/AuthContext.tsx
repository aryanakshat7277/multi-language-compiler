import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  signInWithGoogle, 
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
  user: User | null;
  isAdmin: boolean;
  isInstructor: boolean;
  isFirebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithFirebaseEmail: (email: string, password: string) => Promise<void>;
  registerWithFirebaseEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get<User>('/auth/me')
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        });
    }
  }, []);

  const syncFirebaseUser = async (firebaseUser: any) => {
    const idToken = await firebaseUser.getIdToken();
    const res = await api.post<{ token: string; user?: User }>('/auth/firebase', { idToken });
    localStorage.setItem('token', res.token);
    const userData = res.user || await api.get<User>('/auth/me');
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string }>('/auth/login', { email, password });
    localStorage.setItem('token', res.token);
    const userData = await api.get<User>('/auth/me');
    setUser(userData);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await api.post<{ token: string }>('/auth/register', { email, password, displayName });
    localStorage.setItem('token', res.token);
    const userData = await api.get<User>('/auth/me');
    setUser(userData);
  };

  const loginWithGoogle = async () => {
    const fbUser = await signInWithGoogle();
    await syncFirebaseUser(fbUser);
  };

  const loginWithGithub = async () => {
    const fbUser = await signInWithGithub();
    await syncFirebaseUser(fbUser);
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
    signOutFirebase().catch(() => {});
  };

  const role = user?.role?.toUpperCase() || '';

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      isAdmin: role === 'ADMIN',
      isInstructor: role === 'INSTRUCTOR' || role === 'ADMIN',
      isFirebaseReady: isFirebaseConfigured,
      login,
      register,
      loginWithGoogle,
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
