import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

// Configure High-Concurrency SQLite PRAGMAs (WAL Mode, Busy Timeout, Synchronous Normal)
(async () => {
  try {
    // WAL (Write-Ahead Logging): non-blocking concurrent readers & writers
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
    // Set 10-second busy timeout so concurrent transactions wait instead of erroring with SQLITE_BUSY
    await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 10000;');
    // Synchronous = NORMAL: safe and high performance on modern SSDs
    await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
    // Cache size = 10,000 pages (~40MB RAM cache for instant reads)
    await prisma.$executeRawUnsafe('PRAGMA cache_size = 10000;');
    // In-memory temp store for sort/group-by operations
    await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY;');
    // Memory-mapped I/O (up to 30GB) for zero-copy kernel reads
    await prisma.$executeRawUnsafe('PRAGMA mmap_size = 30000000000;');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    logger.info('Database initialized with High-Concurrency WAL mode (busy_timeout=10s, mmap enabled)');
  } catch (err: any) {
    logger.warn(`SQLite PRAGMA tuning notice: ${err.message}`);
  }
})();

export default prisma;
