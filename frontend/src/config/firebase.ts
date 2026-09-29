import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId
);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export async function signInWithGoogle(): Promise<FirebaseUser> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured yet. Please provide your Firebase project keys in frontend/.env.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithGithub(): Promise<FirebaseUser> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured yet. Please provide your Firebase project keys in frontend/.env.');
  }
  const result = await signInWithPopup(auth, githubProvider);
  return result.user;
}

export async function signInWithFirebaseEmail(email: string, password: string): Promise<FirebaseUser> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured yet. Please provide your Firebase project keys in frontend/.env.');
  }
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithFirebaseEmail(email: string, password: string, displayName?: string): Promise<FirebaseUser> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured yet. Please provide your Firebase project keys in frontend/.env.');
  }
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  if (isFirebaseConfigured) {
    await fbSignOut(auth);
  }
}
