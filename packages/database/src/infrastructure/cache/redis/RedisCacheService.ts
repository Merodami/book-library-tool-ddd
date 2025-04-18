import { logger } from '@book-library-tool/shared'
import { Document } from 'mongodb'
import { createClient, RedisClientType } from 'redis'

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
 * RedisCacheService provides a Redis-based caching mechanism with TTL support.
 * It handles cache operations, cleanup, and metrics tracking.
 */
export class RedisCacheService {
  private client: RedisClientType
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
  }

  constructor() {
    const host = process.env.REDIS_HOST || 'localhost'
    const port = process.env.REDIS_PORT || '6379'
    const redisUrl = `redis://${host}:${port}`

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          const delay = Math.min(
            Number(process.env.REDIS_RETRY_DELAY || 50) * Math.pow(2, retries),
            Number(process.env.REDIS_MAX_RETRY_DELAY || 2000),
          )

          return delay
        },
      },
    })

    this.client.on('error', (err: Error) => {
      logger.error('Redis Client Error:', err)
    })

    this.client.on('connect', () => {
      logger.info('Redis client connected')
    })

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...')
    })

    this.client.connect()
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
  async get<T extends Document>(key: string): Promise<T | null> {
    try {
      const cached = await this.client.get(key)

      if (!cached) {
        this.metrics.misses++

        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)
      const now = Date.now()

      if (now - entry.timestamp > entry.ttl) {
        await this.client.del(key)
        this.metrics.misses++

        return null
      }

      this.metrics.hits++

      return entry.data
    } catch (error) {
      logger.error('Error getting from Redis cache:', error)

      return null
    }
  }

  /**
   * Stores data in cache with TTL
   */
  async set<T extends Document>(
    key: string,
    data: T,
    ttl: number = Number(process.env.REDIS_DEFAULT_TTL || 3600) * 1000,
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      }

      await this.client.set(key, JSON.stringify(entry), {
        PX: ttl, // Set expiration in milliseconds
      })
    } catch (error) {
      logger.error('Error setting Redis cache:', error)
    }
  }

  /**
   * Invalidates cache entries for a specific collection
   */
  async invalidateCollection(collectionName: string): Promise<void> {
    try {
      const keys = await this.client.keys(`${collectionName}:*`)

      if (keys.length > 0) {
        await this.client.del(keys)
      }
    } catch (error) {
      logger.error('Error invalidating Redis cache collection:', error)
    }
  }

  /**
   * Clears the entire cache
   */
  async clear(): Promise<void> {
    try {
      await this.client.flushDb()
    } catch (error) {
      logger.error('Error clearing Redis cache:', error)
    }
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
   * Disposes of the RedisCacheService by closing the Redis connection.
   * This should be called when the service is no longer needed to prevent memory leaks.
   */
  async dispose(): Promise<void> {
    try {
      await this.client.quit()
    } catch (error) {
      logger.error('Error disposing Redis cache:', error)
    }
  }
}
