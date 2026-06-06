import type { CacheEntry, CacheMetadata } from "./types";

/**
 * Volatile in-memory registry for caching aggregated domain calculations.
 * Used exclusively for non-persistent, read-heavy operations.
 */
class MemoryCacheRegistry {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Generates cache metadata.
   */
  private generateMetadata(key: string, ttlInSeconds: number): CacheMetadata {
    return {
      cacheKey: key,
      cachedAt: new Date(),
      ttlInSeconds,
      isStale: false,
    };
  }

  /**
   * Set a payload in the memory cache with a specific Time-To-Live.
   */
  public set<T>(key: string, payload: T, ttlInSeconds: number = 300): void {
    const entry: CacheEntry<T> = {
      metadata: this.generateMetadata(key, ttlInSeconds),
      payload,
    };
    this.cache.set(key, entry);
  }

  /**
   * Retrieves a payload if it exists and is not stale/expired.
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.metadata.isStale) {
      this.cache.delete(key);
      return null;
    }

    const now = new Date().getTime();
    const expiryTime = entry.metadata.cachedAt.getTime() + entry.metadata.ttlInSeconds * 1000;

    if (now > expiryTime) {
      this.cache.delete(key);
      return null;
    }

    return entry.payload as T;
  }

  /**
   * Forces invalidation of a specific cache key (Write-Through invalidation).
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidates all cache entries matching a prefix pattern.
   * Useful for clearing all keys related to a specific entity (e.g. 'partner_123_*').
   */
  public invalidatePattern(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Empties the entire cache.
   */
  public clearAll(): void {
    this.cache.clear();
  }
}

// Global Singleton Instance
export const CacheService = new MemoryCacheRegistry();
