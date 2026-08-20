import dotenv from 'dotenv';
dotenv.config();

export const env = {
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  DOCKER_SOCKET: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  SANDBOX_IMAGE: process.env.SANDBOX_IMAGE || 'code-sandbox:latest',
  EXECUTION_TIMEOUT_MS: parseInt(process.env.EXECUTION_TIMEOUT_MS || '10000', 10),
  MAX_MEMORY_MB: parseInt(process.env.MAX_MEMORY_MB || '256', 10),
  MAX_OUTPUT_BYTES: parseInt(process.env.MAX_OUTPUT_BYTES || '1048576', 10),
  MAX_CPU_CORES: parseFloat(process.env.MAX_CPU_CORES || '1'),
  MAX_PIDS: parseInt(process.env.MAX_PIDS || '64', 10),
  MAX_DISK_MB: parseInt(process.env.MAX_DISK_MB || '64', 10),
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
};
