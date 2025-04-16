/**
 * Configuration options for cache setup and behavior
 */
export interface CacheConfig {
  /** Redis server hostname or IP address */
  host?: string
  /** Redis server port number */
  port?: number
  /** Default time-to-live in seconds for cached items */
  defaultTTL?: number
  /** Initial delay in milliseconds between retry attempts */
  retryDelay?: number
  /** Maximum delay in milliseconds between retry attempts */
  maxRetryDelay?: number
}

/**
 * Represents the health status of the cache system
 */
export interface HealthStatus {
  /** Overall health status of the cache system */
  status: 'healthy' | 'degraded' | 'unhealthy'
  /** Detailed health metrics */
  details: {
    /** Whether the connection to Redis is active */
    connection: boolean
    /** Current latency in milliseconds */
    latency: number
    /** Number of errors encountered */
    errors: number
  }
}

/**
 * Redis configuration interface for establishing and managing Redis connections
 */
export interface RedisConfig {
  /** Redis server hostname or IP address */
  host: string
  /** Redis server port number */
  port: number
  /** Default time-to-live in seconds for cached items */
  defaultTTL: number
  /** Initial delay in milliseconds between retry attempts */
  retryDelay: number
  /** Maximum delay in milliseconds between retry attempts */
  maxRetryDelay: number
  /** Number of items to scan per iteration in SCAN operations */
  scanCount: number
}

/**
 * Cache options for fine-tuned control over caching behavior
 */
export interface CacheOptions {
  /** Time-to-live in seconds for the cached item */
  ttl?: number
  /** Custom key prefix to namespace cache keys */
  prefix?: string
  /** Whether the cache can be bypassed using force parameter */
  bypassable?: boolean
  /** Function to determine if the result should be cached based on its value */
  condition?: (result: any) => boolean
  /** Only cache the result if it evaluates to true */
  cacheIfTruthy?: boolean
  /** Only cache the result if it's an array with at least one item */
  cacheIfHasItems?: boolean
  /** Whether to cache null or undefined values */
  cacheNullValues?: boolean
  /** Custom function to generate cache keys for complex objects */
  hashFunction?: (args: any[]) => string
  /** Time-to-live in seconds for local memory cache (0 disables local caching) */
  localTtl?: number
}

/**
 * Cache statistics tracking interface for monitoring cache performance
 */
export interface CacheStats {
  /** Number of successful cache hits */
  hits: number
  /** Number of cache misses */
  misses: number
  /** Number of errors encountered during cache operations */
  errors: number
  /** Average time in milliseconds for successful cache hits */
  avgHitTime: number
  /** Average time in milliseconds for cache misses */
  avgMissTime: number
}
