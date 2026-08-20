import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PistonExecuteRequest, PistonExecuteResponse } from './piston/pistonTypes';
import { logger } from '../utils/logger';

export class LocalExecutorService {
  private static cachedPaths: Record<string, string> = {};

  /**
   * Search for compiler/runtime binaries across standard Windows & Unix locations.
   */
  public static findBinary(binName: string): string {
    if (this.cachedPaths[binName] && fs.existsSync(this.cachedPaths[binName])) {
      return this.cachedPaths[binName];
    }

    const isWin = process.platform === 'win32';
    const names = isWin ? [binName, `${binName}.exe`, `${binName}.cmd`, `${binName}.bat`] : [binName];

    // 1. Check current process.env.PATH
    const pathDirs = (process.env.PATH || '').split(path.delimiter);

    // 2. Add well-known candidate paths on Windows
    if (isWin) {
      const userHome = os.homedir();
      const localAppData = process.env.LOCALAPPDATA || path.join(userHome, 'AppData', 'Local');
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

      const candidateDirs = [
        path.join(localAppData, 'Microsoft', 'WinGet', 'Packages'),
        path.join(localAppData, 'Programs'),
        path.join(programFiles, 'mingw64', 'bin'),
        path.join(programFiles, 'MinGW', 'bin'),
        path.join(programFiles, 'LLVM', 'bin'),
        path.join(programFiles, 'Go', 'bin'),
        path.join(userHome, 'go', 'bin'),
        path.join(userHome, '.cargo', 'bin'),
        path.join(programFiles, 'Common Files', 'Oracle', 'Java', 'javapath'),
        path.join(programFiles, 'Java'),
        'C:\\mingw64\\bin',
        'C:\\MinGW\\bin',
        'C:\\TDM-GCC-64\\bin',
        'C:\\Python314',
        'C:\\Python313',
        'C:\\Python312',
        'C:\\Python311',
        'C:\\Python310',
        'C:\\Program Files\\Go\\bin',
      ];

      // Direct check in candidates
      for (const cDir of candidateDirs) {
        if (!fs.existsSync(cDir)) continue;

        for (const n of names) {
          const direct = path.join(cDir, n);
          if (fs.existsSync(direct)) {
            this.cachedPaths[binName] = direct;
            return direct;
          }
        }

        // Search 2 levels deep for nested toolchains (e.g. WinGet package / Java jdk / mingw64)
        try {
          const entries = fs.readdirSync(cDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subDir = path.join(cDir, entry.name);
              const subBin = path.join(subDir, 'bin');
              const mingwBin = path.join(subDir, 'mingw64', 'bin');

              for (const searchPath of [subBin, mingwBin, subDir]) {
                if (!fs.existsSync(searchPath)) continue;
                for (const n of names) {
                  const candidate = path.join(searchPath, n);
                  if (fs.existsSync(candidate)) {
                    this.cachedPaths[binName] = candidate;
                    return candidate;
                  }
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    for (const dir of pathDirs) {
      if (!dir) continue;
      for (const n of names) {
        const full = path.join(dir, n);
        if (fs.existsSync(full)) {
          this.cachedPaths[binName] = full;
          return full;
        }
      }
    }

    // Default fallback to naked command name
    return binName;
  }

  /**
   * Execute code locally on the host system as a fallback when Piston container is offline.
   */
  static async execute(request: PistonExecuteRequest): Promise<PistonExecuteResponse> {
    const tempDir = path.join(os.tmpdir(), `codeforge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const startTime = Date.now();

    try {
      const lang = request.language.toLowerCase();
      let mainFile = request.files[0]?.name ? path.basename(request.files[0].name) : 'main.txt';

      // 1. Special handling for Java public class detection
      if (lang === 'java') {
        const content = request.files[0]?.content || '';
        const match = content.match(/public\s+class\s+([A-Za-z0-9_$]+)/) || content.match(/class\s+([A-Za-z0-9_$]+)/);
        const className = match ? match[1] : 'Main';
        mainFile = `${className}.java`;
      }

      // Write files to temporary execution directory
      for (const file of request.files) {
        let filename = file.name || (lang.includes('py') ? 'main.py' : lang === 'java' ? mainFile : 'index.js');
        const safeName = path.basename(filename);
        fs.writeFileSync(path.join(tempDir, safeName), file.content, 'utf8');
      }

      const mainFilePath = path.join(tempDir, mainFile);

      // 2. Determine command based on language
      let cmd = '';
      let args: string[] = [];

      if (lang.includes('py') || lang === 'python' || lang === 'python3') {
        cmd = this.findBinary('python');
        args = ['-u', mainFilePath, ...(request.args || [])];
      } else if (lang.includes('js') || lang === 'javascript' || lang === 'node') {
        cmd = this.findBinary('node');
        args = [mainFilePath, ...(request.args || [])];
      } else if (lang.includes('ts') || lang === 'typescript') {
        cmd = this.findBinary('node');
        args = ['--experimental-strip-types', mainFilePath, ...(request.args || [])];
      } else if (lang === 'c' || lang === 'gcc') {
        const outBin = path.join(tempDir, 'main.exe');
        const gccBin = this.findBinary('gcc');
        return await this.compileAndRun(tempDir, gccBin, [mainFilePath, '-O2', '-static', '-o', outBin], outBin, request.stdin, request.run_timeout || 5000);
      } else if (lang === 'cpp' || lang === 'c++' || lang === 'g++') {
        const outBin = path.join(tempDir, 'main.exe');
        const gppBin = this.findBinary('g++');
        return await this.compileAndRun(tempDir, gppBin, [mainFilePath, '-std=c++17', '-O2', '-static', '-static-libgcc', '-static-libstdc++', '-o', outBin], outBin, request.stdin, request.run_timeout || 5000);
      } else if (lang === 'java') {
        const javacBin = this.findBinary('javac');
        const javaBin = this.findBinary('java');
        const className = path.basename(mainFile, '.java');
        return await this.compileAndRun(tempDir, javacBin, [mainFilePath], javaBin, request.stdin, request.run_timeout || 6000, ['-cp', tempDir, className]);
      } else if (lang === 'go') {
        const outBin = path.join(tempDir, 'main.exe');
        const goBin = this.findBinary('go');
        return await this.compileAndRun(tempDir, goBin, ['build', '-o', outBin, mainFilePath], outBin, request.stdin, request.run_timeout || 8000);
      } else if (lang === 'rust') {
        const outBin = path.join(tempDir, 'main.exe');
        const rustcBin = this.findBinary('rustc');
        return await this.compileAndRun(tempDir, rustcBin, [mainFilePath, '-O', '-o', outBin], outBin, request.stdin, request.run_timeout || 5000);
      } else {
        throw new Error(`Local execution fallback does not support language: ${request.language}`);
      }

      // 3. Execute directly for interpreted languages
      const result = await this.runProcess(cmd, args, tempDir, request.stdin, request.run_timeout || 10000);
      const executionTime = Date.now() - startTime;

      logger.info(`[LocalExecutor] Executed ${request.language} in ${executionTime}ms (exit code: ${result.code})`);

      return {
        language: request.language,
        version: 'host-runtime',
        run: {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
          signal: result.signal,
          output: result.stdout + (result.stderr ? `\n${result.stderr}` : '')
        }
      };

    } finally {
      // 4. Cleanup temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {
        logger.warn(`Failed to remove temp execution dir: ${tempDir}`, err);
      }
    }
  }

  private static async compileAndRun(
    cwd: string,
    compileCmd: string,
    compileArgs: string[],
    runCmd: string,
    stdin?: string,
    timeoutMs: number = 10000,
    runArgs: string[] = []
  ): Promise<PistonExecuteResponse> {
    // 1. Compile
    const compileRes = await this.runProcess(compileCmd, compileArgs, cwd, undefined, 15000);
    if (compileRes.code !== 0) {
      return {
        language: compileCmd,
        version: 'host-runtime',
        compile: {
          stdout: compileRes.stdout,
          stderr: compileRes.stderr,
          code: compileRes.code,
          signal: compileRes.signal,
          output: compileRes.stderr || compileRes.stdout
        },
        run: {
          stdout: '',
          stderr: compileRes.stderr || 'Compilation failed',
          code: compileRes.code,
          signal: null,
          output: compileRes.stderr || 'Compilation failed'
        }
      };
    }

    // 2. Run compiled executable
    const runRes = await this.runProcess(runCmd, runArgs, cwd, stdin, timeoutMs);
    return {
      language: compileCmd,
      version: 'host-runtime',
      compile: {
        stdout: compileRes.stdout,
        stderr: compileRes.stderr,
        code: 0,
        signal: null,
        output: compileRes.stdout
      },
      run: {
        stdout: runRes.stdout,
        stderr: runRes.stderr,
        code: runRes.code,
        signal: runRes.signal,
        output: runRes.stdout + (runRes.stderr ? `\n${runRes.stderr}` : '')
      }
    };
  }

  private static runProcess(
    command: string,
    args: string[],
    cwd: string,
    stdin?: string,
    timeoutMs: number = 10000
  ): Promise<{ stdout: string; stderr: string; code: number; signal: string | null }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      // Extract directory of the binary to prepend to child PATH so dependent DLLs load seamlessly
      const binDir = path.isAbsolute(command) ? path.dirname(command) : '';
      const envPath = binDir 
        ? `${binDir}${path.delimiter}${process.env.PATH || ''}`
        : process.env.PATH;

      const proc = spawn(command, args, {
        cwd,
        shell: false,
        env: {
          ...process.env,
          PATH: envPath,
          PYTHONUNBUFFERED: '1',
          NODE_ENV: 'production'
        }
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        proc.kill('SIGKILL');
      }, timeoutMs);

      if (stdin && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else if (proc.stdin) {
        proc.stdin.end();
      }

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > 512 * 1024) {
          stdout = stdout.substring(0, 512 * 1024) + '\n[Output truncated...]';
          proc.kill();
        }
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 512 * 1024) {
          stderr = stderr.substring(0, 512 * 1024) + '\n[Error output truncated...]';
          proc.kill();
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout: '',
          stderr: `Process launch error: ${err.message}. Is '${command}' installed on the host system?`,
          code: 127,
          signal: null
        });
      });

      proc.on('close', (code, signal) => {
        clearTimeout(timer);
        if (isTimedOut) {
          resolve({
            stdout,
            stderr: `${stderr}\nExecution timed out (${timeoutMs}ms limit exceeded)`,
            code: 124,
            signal: 'SIGKILL'
          });
        } else {
          resolve({
            stdout,
            stderr,
            code: code ?? 0,
            signal: signal ? String(signal) : null
          });
        }
      });
    });
  }
}
