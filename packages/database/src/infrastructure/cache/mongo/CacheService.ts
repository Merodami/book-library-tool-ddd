import { Document } from 'mongodb'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheMetrics {
  hits: number
  misses: number
}

/**
 * CacheService provides an in-memory caching mechanism with TTL support.
 * It handles cache operations, cleanup, and metrics tracking.
 */
export class CacheService {
  private cache: Map<string, CacheEntry<Document>> = new Map()
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
  }
  private cleanupIntervalId: NodeJS.Timeout | null = null

  constructor() {
    // Start cache cleanup interval
    this.cleanupIntervalId = setInterval(() => this.cleanupCache(), 60000) // Cleanup every minute
  }

  /**
   * Generates a cache key from a query and collection name
   */
  generateCacheKey(
    collectionName: string,
    query: Record<string, unknown>,
  ): string {
    return `${collectionName}:${JSON.stringify(query)}`
  }

  /**
   * Retrieves data from cache if available and not expired
   */
  get<T extends Document>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.metrics.misses++
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.metrics.misses++
      return null
    }

    this.metrics.hits++
    return entry.data as T
  }

  /**
   * Stores data in cache with TTL
   */
  set<T extends Document>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Removes expired entries from cache
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Invalidates cache entries for a specific collection
   */
  invalidateCollection(collectionName: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${collectionName}:`)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Gets the current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  /**
   * Resets the cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
    }
  }

  /**
   * Disposes of the CacheService by clearing the cleanup interval and cache.
   * This should be called when the service is no longer needed to prevent memory leaks.
   */
  dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
    this.clear()
  }
}
