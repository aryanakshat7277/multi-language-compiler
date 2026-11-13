import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

// SQLite-only PRAGMAs (only execute if explicitly running SQLite)
if (process.env.DATABASE_URL?.startsWith('file:')) {
  (async () => {
    try {
      await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
      await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;');
      await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
      await prisma.$queryRawUnsafe('PRAGMA cache_size = 10000;');
      await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;');
      await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
      logger.info('Database initialized with High-Concurrency SQLite WAL mode');
    } catch (err: any) {
      logger.warn(`SQLite PRAGMA tuning notice: ${err.message}`);
    }
  })();
} else {
  logger.info('Database initialized with Production PostgreSQL engine');
}

export default prisma;
