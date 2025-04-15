/**
 * Redis configuration interface
 */
export interface RedisConfig {
  host: string
  port: number
  defaultTTL: number
  retryDelay: number
  maxRetryDelay: number
  scanCount: number
}

/**
 * Cache options for fine-tuned control
 */
export interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number
  /** Custom key prefix */
  prefix?: string
  /** Enable cache bypass with force parameter */
  bypassable?: boolean
  /** Conditional caching function */
  condition?: (result: any) => boolean
  /** Cache result only if truthy */
  cacheIfTruthy?: boolean
  /** Cache result only if result is an array with items */
  cacheIfHasItems?: boolean
  /** Cache null/undefined results */
  cacheNullValues?: boolean
  /** Custom hash function for complex objects */
  hashFunction?: (args: any[]) => string
  /** Local memory cache TTL (0 to disable) */
  localTtl?: number
}

/**
 * Cache statistics tracking interface
 */
export interface CacheStats {
  hits: number
  misses: number
  errors: number
  avgHitTime: number
  avgMissTime: number
}
