import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';
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
  
  // Security & Middleware
  app.use(helmet({ contentSecurityPolicy: false })); // allow Monaco editor and inline worker scripts
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(globalRateLimiter);
  
  // API Routes
  app.use('/api', routes);

  // Serve Production Frontend SPA
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
    logger.info(`Production frontend mounted from ${frontendDist}`);
  }
  
  // Global Error Handler
  app.use(errorHandler);
  
  // Setup WebSocket
  setupWebSocket(server);
  
  // Connect to DB via Prisma
  try {
    await prisma.$connect();
    logger.info('Connected to database via Prisma');
  } catch (err) {
    logger.error('Failed to connect to database', err);
    process.exit(1);
  }

  // HTTP Keep-Alive tuning for reverse proxies (Nginx/Cloudflare)
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.listen(config.port, () => {
    logger.info(`Production-grade server listening on port ${config.port} (PID: ${process.pid})`);
  });

  // Graceful shutdown handling
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
