import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import { PistonExecuteRequest, PistonExecuteResponse, PistonRuntime, PistonHealthStatus } from './pistonTypes';

const executeCode = async (req: PistonExecuteRequest): Promise<PistonExecuteResponse> => {
  const url = `${config.pistonBaseUrl}/api/v2/execute`;
  logger.info(`Sending execution request to Piston: ${req.language} ${req.version}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.compilerReadTimeout);

  let attempt = 0;
  let lastError: any = null;

  while (attempt < 2) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Piston API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as PistonExecuteResponse;
      return data;
    } catch (error: any) {
      lastError = error;
      const isNetworkError = error.name === 'AbortError' || error.name === 'FetchError' || error.message.includes('ECONNREFUSED');
      
      if (isNetworkError && attempt === 0) {
        attempt++;
        logger.warn(`Piston connection error, retrying... (${error.message})`);
        continue;
      }
      
      clearTimeout(timeout);
      logger.error(`Piston execute code error: ${error.message}`);
      throw error;
    }
  }
  
  throw lastError;
};

const getRuntimes = async (): Promise<PistonRuntime[]> => {
  const primaryUrl = `${config.pistonBaseUrl}/runtimes`.replace('/api/v2/api/v2/', '/api/v2/').replace('/api/v2/v2/', '/api/v2/');
  const fallbackUrl = 'https://emkc.org/api/v2/piston/runtimes';
  logger.info('Fetching Piston runtimes');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.compilerConnectTimeout);

  try {
    const response = await fetch(primaryUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json() as PistonRuntime[];
      return data;
    }
  } catch (error: any) {
    clearTimeout(timeout);
    logger.warn(`Primary Piston URL unreachable (${error.message}), falling back to public Piston API...`);
  }

  // Fallback to public Piston API
  try {
    const fbResponse = await fetch(fallbackUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (fbResponse.ok) {
      return (await fbResponse.json()) as PistonRuntime[];
    }
  } catch (fbErr: any) {
    logger.error(`Piston get runtimes error: ${fbErr.message}`);
  }

  return [];
};

const healthCheck = async (): Promise<PistonHealthStatus> => {
  if (!config.pistonBaseUrl) {
    return {
      status: 'CONFIGURATION_ERROR',
      baseUrlConfigured: false,
      reachable: false,
      error: 'PISTON_BASE_URL is not configured'
    };
  }

  try {
    await getRuntimes();
    return {
      status: 'UP',
      baseUrlConfigured: true,
      reachable: true
    };
  } catch (error: any) {
    return {
      status: error.name === 'AbortError' ? 'TIMEOUT' : 'DOWN',
      baseUrlConfigured: true,
      reachable: false,
      error: error.message
    };
  }
};

export const pistonClient = {
  executeCode,
  getRuntimes,
  healthCheck
};
