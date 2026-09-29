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

  // 1. Security Headers (Monaco Editor & WebSocket friendly CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:', 'https://apis.google.com'],
          workerSrc: ["'self'", 'blob:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:', 'https://lh3.googleusercontent.com', 'https://avatars.githubusercontent.com'],
          connectSrc: [
            "'self'", 
            'ws:', 
            'wss:', 
            'https:', 
            'http://localhost:*'
          ],
          frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com']
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  // 2. CORS Policy
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3001'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error('CORS policy: Access denied for this origin.'));
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
  // Check candidate paths where frontend dist might reside
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

  // 8. Server Listen
  server.listen(config.port, () => {
    logger.info(`Production-ready server running on port ${config.port}`);
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
        logger.info('Database connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.error('Bootstrap error', err);
});
