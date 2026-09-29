import * as os from 'os';
import { StageType } from '../../domain/compilation/compilationTypes';
import { CompilationCache } from './compilationCache';

export interface LatencyMetrics {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  compilations: {
    totalRequests: number;
    successful: number;
    failed: number;
    timeouts: number;
    cancellations: number;
    activeConcurrent: number;
    queueDepth: number;
    successRatePct: number;
  };
  latency: LatencyMetrics;
  stageDurations: Partial<Record<StageType, { totalMs: number; count: number; avgMs: number }>>;
  cache: {
    size: number;
    hits: number;
    misses: number;
    hitRatio: number;
  };
  system: {
    cpuCores: number;
    platform: string;
    freeMemoryMb: number;
    totalMemoryMb: number;
    heapUsedMb: number;
    rssMb: number;
  };
}

export class CompilationMetrics {
  private static totalRequests = 0;
  private static successful = 0;
  private static failed = 0;
  private static timeouts = 0;
  private static cancellations = 0;
  private static activeCompilations = 0;
  private static currentQueueDepth = 0;

  // Ring buffer for tracking up to 2000 recent durations for percentiles
  private static readonly MAX_LATENCY_SAMPLES = 2000;
  private static durations: number[] = [];

  // Stage durations aggregator
  private static stageAggregates: Map<StageType, { totalMs: number; count: number }> = new Map();

  public static recordRequest(): void {
    this.totalRequests++;
  }

  public static recordSuccess(durationMs: number): void {
    this.successful++;
    this.addDurationSample(durationMs);
  }

  public static recordFailure(durationMs?: number): void {
    this.failed++;
    if (durationMs !== undefined) this.addDurationSample(durationMs);
  }

  public static recordTimeout(): void {
    this.timeouts++;
    this.failed++;
  }

  public static recordCancellation(): void {
    this.cancellations++;
  }

  public static setActiveCompilations(count: number): void {
    this.activeCompilations = Math.max(0, count);
  }

  public static setQueueDepth(depth: number): void {
    this.currentQueueDepth = Math.max(0, depth);
  }

  public static recordStageDuration(stage: StageType, durationMs: number): void {
    const existing = this.stageAggregates.get(stage) || { totalMs: 0, count: 0 };
    existing.totalMs += durationMs;
    existing.count++;
    this.stageAggregates.set(stage, existing);
  }

  private static addDurationSample(durationMs: number): void {
    if (this.durations.length >= this.MAX_LATENCY_SAMPLES) {
      this.durations.shift();
    }
    this.durations.push(durationMs);
  }

  public static calculatePercentiles(): LatencyMetrics {
    if (this.durations.length === 0) {
      return { p50Ms: 0, p95Ms: 0, p99Ms: 0, avgMs: 0, minMs: 0, maxMs: 0 };
    }

    const sorted = [...this.durations].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, v) => acc + v, 0);

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
    const p99Index = Math.min(count - 1, Math.floor(count * 0.99));

    return {
      p50Ms: sorted[p50Index],
      p95Ms: sorted[p95Index],
      p99Ms: sorted[p99Index],
      avgMs: Math.round(sum / count),
      minMs: sorted[0],
      maxMs: sorted[count - 1]
    };
  }

  public static getSnapshot(): MetricsSnapshot {
    const memory = process.memoryUsage();
    const cacheStats = CompilationCache.getStats();
    const totalFinished = this.successful + this.failed;
    const successRate = totalFinished > 0 ? parseFloat(((this.successful / totalFinished) * 100).toFixed(1)) : 100;

    const stages: Partial<Record<StageType, { totalMs: number; count: number; avgMs: number }>> = {};
    for (const [stage, data] of this.stageAggregates.entries()) {
      stages[stage] = {
        totalMs: data.totalMs,
        count: data.count,
        avgMs: data.count > 0 ? Math.round(data.totalMs / data.count) : 0
      };
    }

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      compilations: {
        totalRequests: this.totalRequests,
        successful: this.successful,
        failed: this.failed,
        timeouts: this.timeouts,
        cancellations: this.cancellations,
        activeConcurrent: this.activeCompilations,
        queueDepth: this.currentQueueDepth,
        successRatePct: successRate
      },
      latency: this.calculatePercentiles(),
      stageDurations: stages,
      cache: {
        size: cacheStats.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRatio: cacheStats.hitRatio
      },
      system: {
        cpuCores: os.cpus()?.length || 1,
        platform: process.platform,
        freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        rssMb: Math.round(memory.rss / (1024 * 1024))
      }
    };
  }

  public static reset(): void {
    this.totalRequests = 0;
    this.successful = 0;
    this.failed = 0;
    this.timeouts = 0;
    this.cancellations = 0;
    this.activeCompilations = 0;
    this.currentQueueDepth = 0;
    this.durations = [];
    this.stageAggregates.clear();
  }
}
