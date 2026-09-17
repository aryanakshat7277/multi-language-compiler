import { createHash } from 'crypto';
import { CompilationRequest, CompilationResult } from '../../domain/compilation/compilationTypes';
import { COMPILATION_LIMITS } from '../../config/compilationConfig';

interface CacheEntry {
  result: CompilationResult;
  expiresAt: number;
  accessedAt: number;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRatio: number;
}

export class CompilationCache {
  private static cache: Map<string, CacheEntry> = new Map();
  private static hits = 0;
  private static misses = 0;
  private static evictions = 0;

  /**
   * Generates a deterministic, collision-resistant SHA-256 fingerprint from compilation inputs.
   */
  public static generateSourceHash(request: CompilationRequest): string {
    const canonicalInput = [
      request.language.toLowerCase().trim(),
      request.sourceCode,
      request.compilerVersion || 'default',
      request.optimizationLevel || 'O0',
      request.target || 'native',
      request.stdin || ''
    ].join('::');

    return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
  }

  /**
   * Retrieve a cached compilation result by deterministic hash.
   */
  public static get(sourceHash: string): CompilationResult | null {
    const entry = this.cache.get(sourceHash);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(sourceHash);
      this.misses++;
      return null;
    }

    entry.accessedAt = Date.now();
    this.hits++;
    return entry.result;
  }

  /**
   * Store a compilation result into the bounded LRU cache.
   */
  public static set(sourceHash: string, result: CompilationResult): void {
    // Only cache deterministic successes
    if (result.status !== 'SUCCEEDED') return;

    // Prune if capacity exceeded
    if (this.cache.size >= COMPILATION_LIMITS.cacheMaxEntries) {
      this.evictOldest();
    }

    const expiresAt = Date.now() + COMPILATION_LIMITS.cacheTtlMs;
    this.cache.set(sourceHash, {
      result,
      expiresAt,
      accessedAt: Date.now()
    });
  }

  /**
   * Evict the least recently accessed item.
   */
  private static evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessedAt < oldestAccess) {
        oldestAccess = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }

  public static clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  public static getStats(): CacheStats {
    const totalLookups = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxEntries: COMPILATION_LIMITS.cacheMaxEntries,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRatio: totalLookups > 0 ? parseFloat((this.hits / totalLookups).toFixed(3)) : 0
    };
  }
}
