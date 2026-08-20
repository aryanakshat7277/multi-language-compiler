import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
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
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(globalRateLimiter);
  
  // API Routes
  app.use('/api', routes);
  
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

  server.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });
}

bootstrap().catch(err => {
  logger.error('Bootstrap error', err);
});
