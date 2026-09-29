import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import routes from './routes';
import { setupWebSocket } from './websocket/statusServer';
import prisma from './config/database';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  // 1. Security Headers (Monaco Editor, OAuth Popup & WebSocket friendly CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", 'https:', 'data:', 'blob:'],
          scriptSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "'unsafe-eval'", 
            'blob:', 
            'https://apis.google.com',
            'https://*.firebaseapp.com',
            'https://*.googleapis.com',
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com'
          ],
          workerSrc: ["'self'", 'blob:', 'https://cdn.jsdelivr.net'],
          styleSrc: [
            "'self'", 
            "'unsafe-inline'", 
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com'
          ],
          fontSrc: [
            "'self'", 
            'https://fonts.gstatic.com', 
            'data:', 
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com'
          ],
          imgSrc: [
            "'self'", 
            'data:', 
            'https:', 
            'blob:', 
            'https://lh3.googleusercontent.com', 
            'https://avatars.githubusercontent.com'
          ],
          connectSrc: [
            "'self'", 
            'ws:', 
            'wss:', 
            'https:', 
            'http://localhost:*',
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
            'https://*.firebaseio.com',
            'https://*.firebaseapp.com',
            'https://cdn.jsdelivr.net'
          ],
          frameSrc: [
            "'self'", 
            'https://*.firebaseapp.com', 
            'https://accounts.google.com',
            'https://*.google.com'
          ]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false
    })
  );

  // 2. CORS Policy
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3001', 'https://codeforge-pro.onrender.com'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (
          !origin || 
          allowedOrigins.includes(origin) || 
          (origin && origin.endsWith('.onrender.com')) || 
          process.env.NODE_ENV !== 'production'
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy: Access denied for origin ${origin}`));
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(globalRateLimiter);

  // 3. API Routes
  app.use('/api', routes);

  // 4. Production Static Single-Port Delivery (Frontend React SPA)
  const candidateDistPaths = [
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../frontend/dist')
  ];

  let frontendDist = candidateDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));

  if (frontendDist) {
    logger.info(`Serving static frontend SPA from: ${frontendDist}`);
    app.use(express.static(frontendDist));

    // Client-side routing fallback (for React Router)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
        return next();
      }
      res.sendFile(path.join(frontendDist!, 'index.html'));
    });
  } else {
    logger.info('Frontend dist folder not found; running in API-only mode.');
  }

  // 5. Global Error Handler
  app.use(errorHandler);

  // 6. Setup WebSocket Server on same HTTP port
  setupWebSocket(server);

  // 7. Database Connection
  try {
    await prisma.$connect();
    logger.info('Connected to database via Prisma');
  } catch (err) {
    logger.error('Failed to connect to database', err);
    process.exit(1);
  }

  // 8. HTTP Keep-Alive tuning for reverse proxies (Nginx/Cloudflare/Render)
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  // 9. Server Listen
  server.listen(config.port, () => {
    logger.info(`Production-ready server running on port ${config.port} (PID: ${process.pid})`);
    logger.info(`API Base URL: http://localhost:${config.port}/api`);
    if (frontendDist) {
      logger.info(`Web UI available at: http://localhost:${config.port}`);
    }
  });

  // Graceful Shutdown Handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await prisma.$disconnect();
        logger.info('Prisma database connection closed cleanly.');
      } catch (err) {
        logger.error('Error closing database connection', err);
      }
      process.exit(0);
    });

    // Force shutdown after 10s if connections linger
    setTimeout(() => {
      logger.error('Forced shutdown due to lingering connections.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.error('Bootstrap fatal error', err);
});
