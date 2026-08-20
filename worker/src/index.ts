import Dockerode from 'dockerode';
import { env } from './config/env';
import { ExecutionWorker } from './executor/ExecutionWorker';
import { logger } from './utils/logger';

async function verifyDocker() {
  const socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : env.DOCKER_SOCKET;
  const docker = new Dockerode({ socketPath });
  try {
    await docker.ping();
    logger.info('Successfully connected to Docker daemon.');
  } catch (err) {
    logger.error('Failed to connect to Docker daemon. Is Docker running?', { error: err });
    process.exit(1);
  }
}

async function start() {
  logger.info('Starting Compiler Worker...', { env });
  
  await verifyDocker();
  
  const worker = new ExecutionWorker();
  
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
}

start().catch(err => {
  logger.error('Fatal error during startup', { error: err });
  process.exit(1);
});
