import { PistonExecuteRequest, PistonExecuteResponse } from './piston/pistonTypes';
import { logger } from '../utils/logger';

export class CloudSandboxService {
  private static readonly PAIZA_BASE_URL = 'https://api.paiza.io';
  private static readonly API_KEY = 'guest';

  /**
   * Map CodeForge / Piston language to Paiza language identifier
   */
  private static mapLanguage(lang: string): string {
    const l = (lang || '').toLowerCase().trim();
    if (l === 'python' || l === 'python3' || l.includes('py')) return 'python3';
    if (l === 'rust' || l === 'rs') return 'rust';
    if (l === 'go' || l === 'golang') return 'go';
    if (l === 'java') return 'java';
    if (l === 'c') return 'c';
    if (l === 'cpp' || l === 'c++' || l === 'g++') return 'cpp';
    if (l === 'javascript' || l === 'node' || l === 'js') return 'javascript';
    if (l === 'typescript' || l === 'ts') return 'typescript';
    if (l === 'ruby' || l === 'rb') return 'ruby';
    if (l === 'php') return 'php';
    if (l === 'csharp' || l === 'cs' || l === 'c#') return 'csharp';
    return l;
  }

  /**
   * Normalize source code for cloud runners
   * e.g., Java requires the public class with main to be named Main on Paiza
   */
  private static prepareSource(lang: string, files: Array<{ name?: string; content: string }>): string {
    if (!files || files.length === 0) return '';
    let mainContent = files[0].content || '';

    const lowerLang = (lang || '').toLowerCase();
    if (lowerLang === 'java') {
      // If code contains a public class that is not Main, normalize it to Main so Paiza can find the entry point
      if (!/\bclass\s+Main\b/.test(mainContent)) {
        mainContent = mainContent.replace(/\bpublic\s+class\s+([A-Za-z0-9_$]+)/, 'public class Main');
        if (!/\bclass\s+Main\b/.test(mainContent)) {
          mainContent = mainContent.replace(/\bclass\s+([A-Za-z0-9_$]+)/, 'class Main');
        }
      }
    }

    return mainContent;
  }

  /**
   * Execute code on the universal cloud sandbox runner
   */
  public static async execute(request: PistonExecuteRequest): Promise<PistonExecuteResponse> {
    const startTime = Date.now();
    const targetLang = this.mapLanguage(request.language);
    const sourceCode = this.prepareSource(request.language, request.files);
    const stdin = request.stdin || '';
    const timeoutMs = request.run_timeout || 15000;

    logger.info(`[CloudSandbox] Dispatching ${request.language} (${targetLang}) to Universal Cloud Sandbox...`);

    // 1. Create runner session
    const createParams = new URLSearchParams({
      source_code: sourceCode,
      language: targetLang,
      input: stdin,
      api_key: this.API_KEY
    });

    const createResp = await fetch(`${this.PAIZA_BASE_URL}/runners/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CodeForgePro/2.5'
      },
      body: createParams.toString()
    });

    if (!createResp.ok) {
      throw new Error(`Cloud runner creation failed with status ${createResp.status} ${createResp.statusText}`);
    }

    const createData = (await createResp.json()) as { id?: string; status?: string; error?: string };
    if (!createData.id) {
      throw new Error(`Cloud runner returned no session id: ${createData.error || 'Unknown error'}`);
    }

    const sessionId = createData.id;

    // 2. Poll for completion
    const pollInterval = 400;
    const maxPolls = Math.max(10, Math.floor(timeoutMs / pollInterval));

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, pollInterval));

      const statusUrl = `${this.PAIZA_BASE_URL}/runners/get_details?id=${encodeURIComponent(sessionId)}&api_key=${this.API_KEY}`;
      const statusResp = await fetch(statusUrl, {
        headers: { 'User-Agent': 'CodeForgePro/2.5' }
      });

      if (!statusResp.ok) continue;

      const details = (await statusResp.json()) as {
        status?: string;
        stdout?: string;
        stderr?: string;
        build_stdout?: string;
        build_stderr?: string;
        build_exit_code?: number;
        exit_code?: number | string;
        time?: string;
        memory?: number | string;
        result?: string;
      };

      if (details.status === 'completed') {
        const rawBuildExit = details.build_exit_code != null ? Number(details.build_exit_code) : 0;
        const rawExit = details.exit_code != null ? Number(details.exit_code) : 0;
        const isCompileError = rawBuildExit !== 0 || (details.result === 'failure' && !!details.build_stderr);

        const buildOut = details.build_stdout || '';
        const buildErr = details.build_stderr || '';
        const runOut = details.stdout || '';
        const runErr = details.stderr || '';

        const duration = Date.now() - startTime;
        logger.info(`[CloudSandbox] Completed ${request.language} execution in ${duration}ms (status: ${details.result || 'success'})`);

        if (isCompileError) {
          return {
            language: request.language,
            version: 'cloud-universal',
            compile: {
              stdout: buildOut,
              stderr: buildErr,
              code: rawBuildExit !== 0 ? rawBuildExit : 1,
              signal: null,
              output: buildErr || buildOut || 'Compilation failed'
            },
            run: {
              stdout: '',
              stderr: buildErr || 'Compilation error',
              code: rawBuildExit !== 0 ? rawBuildExit : 1,
              signal: null,
              output: buildErr || 'Compilation error'
            }
          };
        }

        return {
          language: request.language,
          version: 'cloud-universal',
          compile: {
            stdout: buildOut,
            stderr: buildErr,
            code: 0,
            signal: null,
            output: buildOut
          },
          run: {
            stdout: runOut,
            stderr: runErr,
            code: rawExit,
            signal: null,
            output: runOut + (runErr ? `\n${runErr}` : '')
          }
        };
      }
    }

    // Timeout
    return {
      language: request.language,
      version: 'cloud-universal',
      run: {
        stdout: '',
        stderr: `Execution timed out after ${timeoutMs}ms`,
        code: 124,
        signal: 'SIGKILL',
        output: `Execution timed out after ${timeoutMs}ms`
      }
    };
  }
}
