import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { config } from './env';
import { logger } from '../utils/logger';

let firebaseApp: App | null = null;

try {
  if (config.firebaseServiceAccountJson) {
    const serviceAccount = JSON.parse(config.firebaseServiceAccountJson);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount)
    });
    logger.info('[FirebaseAdmin] Initialized with Service Account JSON');
  } else if (config.firebaseProjectId && config.firebasePrivateKey && config.firebaseClientEmail) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId: config.firebaseProjectId,
        clientEmail: config.firebaseClientEmail,
        privateKey: config.firebasePrivateKey
      })
    });
    logger.info('[FirebaseAdmin] Initialized with Service Account Credentials');
  } else if (config.firebaseProjectId) {
    firebaseApp = initializeApp({
      projectId: config.firebaseProjectId
    });
    logger.info(`[FirebaseAdmin] Initialized with Project ID: ${config.firebaseProjectId}`);
  } else {
    logger.info('[FirebaseAdmin] No Firebase credentials provided yet in environment.');
  }
} catch (err: any) {
  logger.warn(`[FirebaseAdmin] Failed to initialize: ${err.message}`);
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  if (!getApps().length) {
    if (config.firebaseProjectId) {
      firebaseApp = initializeApp({ projectId: config.firebaseProjectId });
    } else {
      throw new Error('Firebase Admin is not configured. Please supply FIREBASE_PROJECT_ID or Service Account credentials in backend/.env.');
    }
  }

  const auth = getAuth(firebaseApp || undefined);
  return await auth.verifyIdToken(idToken);
}

export const isFirebaseAdminConfigured = () => Boolean(getApps().length || config.firebaseProjectId);
