import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databaseUrl: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiApiKeyFallback: process.env.GEMINI_API_KEY_FALLBACK || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  pistonBaseUrl: process.env.PISTON_BASE_URL || 'https://emkc.org/api/v2/piston',
  compilerConnectTimeout: parseInt(process.env.COMPILER_CONNECT_TIMEOUT || '3000'),
  compilerReadTimeout: parseInt(process.env.COMPILER_READ_TIMEOUT || '15000'),
  compilerMaxSourceSize: parseInt(process.env.COMPILER_MAX_SOURCE_SIZE || '102400'),
  compilerMaxFiles: parseInt(process.env.COMPILER_MAX_FILES || '20'),
  compilerMaxStdinSize: parseInt(process.env.COMPILER_MAX_STDIN_SIZE || '51200'),
  compilerMaxConcurrentJobs: parseInt(process.env.COMPILER_MAX_CONCURRENT_JOBS || '10'),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''
};
