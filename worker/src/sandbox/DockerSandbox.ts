import Dockerode from 'dockerode';
import { env } from '../config/env';
import { LanguageConfig } from '../config/languages';
import { createTarBuffer } from '../utils/tar';
import { logger } from '../utils/logger';

export interface SandboxConfig {
  image?: string;
  memoryMb?: number;
  cpuCores?: number;
  maxPids?: number;
  diskMb?: number;
}

export interface ExecOptions {
  cmd: string[];
  stdin?: string;
  timeoutMs?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  oomKilled: boolean;
  executionTimeMs: number;
}

export interface CompileResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface ExecuteResult extends ExecResult {
  memoryUsedMb?: number;
}

export class DockerSandbox {
  private docker: Dockerode;
  private container: Dockerode.Container | null = null;
  private containerId: string | null = null;
  private config: SandboxConfig;

  constructor(config: SandboxConfig = {}) {
    // Determine socket path depending on OS (Windows/Linux)
    const socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : env.DOCKER_SOCKET;
    this.docker = new Dockerode({ socketPath });
    this.config = {
      image: env.SANDBOX_IMAGE,
      memoryMb: env.MAX_MEMORY_MB,
      cpuCores: env.MAX_CPU_CORES,
      maxPids: env.MAX_PIDS,
      diskMb: env.MAX_DISK_MB,
      ...config,
    };
  }

  async create(): Promise<void> {
    try {
      this.container = await this.docker.createContainer({
        Image: this.config.image,
        Cmd: ['sleep', '300'], // Keep container alive
        WorkingDir: '/workspace',
        User: '1000:1000',
        NetworkDisabled: true, // Legacy boolean property sometimes required
        HostConfig: {
          NetworkMode: 'none',
          ReadonlyRootfs: true,
          Memory: (this.config.memoryMb || env.MAX_MEMORY_MB) * 1024 * 1024,
          MemorySwap: (this.config.memoryMb || env.MAX_MEMORY_MB) * 1024 * 1024,
          NanoCpus: (this.config.cpuCores || env.MAX_CPU_CORES) * 1_000_000_000,
          PidsLimit: this.config.maxPids || env.MAX_PIDS,
          SecurityOpt: ['no-new-privileges:true'],
          CapDrop: ['ALL'],
          Tmpfs: {
            '/workspace': `rw,exec,nosuid,size=${this.config.diskMb || env.MAX_DISK_MB}m`,
            '/tmp': 'rw,nosuid,nodev,size=32m'
          },
        },
      });

      this.containerId = this.container.id;
      await this.container.start();
      logger.info(`Sandbox created and started: ${this.containerId}`);
    } catch (error) {
      logger.error('Failed to create sandbox container', { error });
      throw error;
    }
  }

  async copyFiles(files: { name: string; content: string }[]): Promise<void> {
    if (!this.container) throw new Error('Container not initialized');
    
    try {
      const tarBuffer = createTarBuffer(files);
      await this.container.putArchive(tarBuffer, {
        path: '/workspace',
      });
    } catch (error) {
      logger.error('Failed to copy files to sandbox', { containerId: this.containerId, error });
      throw error;
    }
  }

  async exec(options: ExecOptions): Promise<ExecResult> {
    if (!this.container) throw new Error('Container not initialized');

    const timeoutMs = options.timeoutMs || env.EXECUTION_TIMEOUT_MS;
    const startTime = Date.now();

    try {
      const exec = await this.container.exec({
        Cmd: options.cmd,
        AttachStdin: !!options.stdin,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      const stream = await exec.start({
        hijack: true,
        stdin: !!options.stdin,
      });

      if (options.stdin && typeof options.stdin === 'string') {
        stream.write(options.stdin);
        stream.end();
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Handle output streams using dockerode modem demux
      await new Promise<void>((resolve, reject) => {
        const timeoutTimer = setTimeout(() => {
          timedOut = true;
          // Forcefully kill the container if it times out
          this.container?.kill().catch(() => {});
          resolve();
        }, timeoutMs);

        // We wrap stream output capturing to limit the size
        const maxBytes = env.MAX_OUTPUT_BYTES;
        let stdoutBytes = 0;
        let stderrBytes = 0;

        this.docker.modem.demuxStream(
          stream,
          {
            write: (chunk: Buffer) => {
              if (stdoutBytes < maxBytes) {
                const toAdd = chunk.toString('utf8');
                stdout += toAdd;
                stdoutBytes += Buffer.byteLength(toAdd);
              }
            }
          },
          {
            write: (chunk: Buffer) => {
              if (stderrBytes < maxBytes) {
                const toAdd = chunk.toString('utf8');
                stderr += toAdd;
                stderrBytes += Buffer.byteLength(toAdd);
              }
            }
          }
        );

        stream.on('end', () => {
          clearTimeout(timeoutTimer);
          resolve();
        });
        stream.on('error', (err: any) => {
          clearTimeout(timeoutTimer);
          reject(err);
        });
      });

      const execInspect = await exec.inspect();
      const executionTimeMs = Date.now() - startTime;

      // Check if OOM killed by inspecting container state
      const containerInspect = await this.container.inspect();
      const oomKilled = containerInspect.State.OOMKilled;

      return {
        stdout: stdout.length > env.MAX_OUTPUT_BYTES ? stdout.substring(0, env.MAX_OUTPUT_BYTES) + '\\n[Output Truncated]' : stdout,
        stderr: stderr.length > env.MAX_OUTPUT_BYTES ? stderr.substring(0, env.MAX_OUTPUT_BYTES) + '\\n[Output Truncated]' : stderr,
        exitCode: execInspect.ExitCode || 0,
        timedOut,
        oomKilled,
        executionTimeMs,
      };

    } catch (error) {
      logger.error('Exec failed', { containerId: this.containerId, cmd: options.cmd, error });
      throw error;
    }
  }

  async compile(language: LanguageConfig, files: { name: string; content: string }[]): Promise<CompileResult> {
    if (!language.compileCmd) {
      return { success: true, stdout: '', stderr: '', exitCode: 0, duration: 0 };
    }

    const mainFile = files.find(f => f.name === language.mainFile) || files[0];
    const outputFile = mainFile.name.replace(language.extension, '');
    const className = outputFile.split('.')[0];

    const cmdStr = language.compileCmd
      .replace('{file}', mainFile.name)
      .replace('{output}', outputFile)
      .replace('{className}', className);

    // split command naively by space, a proper shell parser might be needed for complex commands
    const cmdArgs = cmdStr.split(' ');

    const startTime = Date.now();
    const result = await this.exec({
      cmd: cmdArgs,
      timeoutMs: env.EXECUTION_TIMEOUT_MS, // Compiler timeout
    });

    return {
      success: result.exitCode === 0 && !result.timedOut,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      duration: Date.now() - startTime,
    };
  }

  async execute(language: LanguageConfig, stdin?: string, timeoutMs?: number): Promise<ExecuteResult> {
    const mainFile = language.mainFile;
    const outputFile = mainFile.replace(language.extension, '');
    const className = outputFile.split('.')[0];

    const cmdStr = language.runCmd
      .replace('{file}', mainFile)
      .replace('{output}', outputFile)
      .replace('{className}', className)
      .replace('{memory}', (language.memoryLimitMb || this.config.memoryMb).toString());

    // Basic cmd splitting
    const cmdArgs = cmdStr.split(' ').filter(Boolean);
    
    // In order to accurately measure memory, we might need a background stats collector,
    // but for simple cases we just run it and check if it was OOMKilled.
    const result = await this.exec({
      cmd: cmdArgs,
      stdin,
      timeoutMs: timeoutMs || language.timeLimitMs || env.EXECUTION_TIMEOUT_MS,
    });

    return {
      ...result,
    };
  }

  async destroy(): Promise<void> {
    if (this.container) {
      try {
        await this.container.kill().catch(() => {}); // ignore if already stopped
        await this.container.remove({ force: true }).catch(() => {});
        logger.info(`Sandbox destroyed: ${this.containerId}`);
      } catch (error) {
        logger.error(`Failed to destroy sandbox: ${this.containerId}`, { error });
      } finally {
        this.container = null;
        this.containerId = null;
      }
    }
  }
}
