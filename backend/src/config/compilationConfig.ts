/**
 * Compilation Configuration & Feature Flags
 * Phase 1 — Production-Grade Foundation
 */

export const APPLICATION_VERSION = '1.0.0';

export interface FeatureFlags {
  ENABLE_TIME_MACHINE: boolean;
  ENABLE_AST_EXPLORER: boolean;
  ENABLE_SEMANTIC_GPS: boolean;
  ENABLE_OPTIMIZATION_REPLAY: boolean;
  ENABLE_WHAT_IF: boolean;
  ENABLE_CFG: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  ENABLE_TIME_MACHINE: process.env.ENABLE_TIME_MACHINE === 'true',
  ENABLE_AST_EXPLORER: process.env.ENABLE_AST_EXPLORER !== 'false', // Default enabled
  ENABLE_SEMANTIC_GPS: process.env.ENABLE_SEMANTIC_GPS === 'true',
  ENABLE_OPTIMIZATION_REPLAY: process.env.ENABLE_OPTIMIZATION_REPLAY === 'true',
  ENABLE_WHAT_IF: process.env.ENABLE_WHAT_IF === 'true',
  ENABLE_CFG: process.env.ENABLE_CFG === 'true',
};

export interface CompilationLimits {
  maxSourceSizeBytes: number;
  maxOutputSizeBytes: number;
  maxTraceSizeBytes: number;
  defaultCompileTimeoutMs: number;
  defaultRunTimeoutMs: number;
  maxConcurrentCompilations: number;
  maxQueueDepth: number;
  cacheMaxEntries: number;
  cacheTtlMs: number;
}

export const COMPILATION_LIMITS: CompilationLimits = {
  // Max source size: 100 KB
  maxSourceSizeBytes: parseInt(process.env.COMPILER_MAX_SOURCE_SIZE || '102400', 10),
  // Max stdout/stderr output size: 512 KB
  maxOutputSizeBytes: parseInt(process.env.COMPILER_MAX_OUTPUT_SIZE || '524288', 10),
  // Max trace metadata size: 1 MB
  maxTraceSizeBytes: parseInt(process.env.COMPILER_MAX_TRACE_SIZE || '1048576', 10),
  // Default timeout per stage
  defaultCompileTimeoutMs: parseInt(process.env.COMPILER_COMPILE_TIMEOUT_MS || '10000', 10),
  defaultRunTimeoutMs: parseInt(process.env.COMPILER_RUN_TIMEOUT_MS || '5000', 10),
  // Concurrency ceiling (tuned for 1500 concurrent user capacity)
  maxConcurrentCompilations: parseInt(process.env.COMPILER_MAX_CONCURRENT || '24', 10),
  // Maximum FIFO queue depth before rejecting with QUEUE_FULL
  maxQueueDepth: parseInt(process.env.COMPILER_MAX_QUEUE_DEPTH || '2000', 10),
  // LRU cache limits
  cacheMaxEntries: parseInt(process.env.COMPILER_CACHE_MAX_ENTRIES || '1000', 10),
  cacheTtlMs: parseInt(process.env.COMPILER_CACHE_TTL_MS || '1800000', 10), // 30 minutes
};
