import { CacheService } from '../../domain/repositories/cache.js'

export interface CacheOptions {
  ttl?: number
  prefix?: string
  bypassable?: boolean
  condition?: (result: any) => boolean
  cacheIfTruthy?: boolean
  cacheIfHasItems?: boolean
  cacheNullValues?: boolean
  hashFunction?: (args: any[]) => string
  localTtl?: number
}

export interface CacheStats {
  hits: number
  misses: number
  errors: number
  avgHitTime: number
  avgMissTime: number
}

/**
 * Cache Decorator
 *
 * This decorator provides a way to cache method results using the configured cache service.
 * It supports various caching strategies and options for fine-grained control over caching behavior.
 */
export function Cache(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value
    const stats: CacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      avgHitTime: 0,
      avgMissTime: 0,
    }

    descriptor.value = async function (...args: any[]) {
      const cacheService = (this as any).cacheService as CacheService
      if (!cacheService) {
        throw new Error('CacheService not found in context')
      }

      const key = generateCacheKey(target, propertyKey, args, options)
      const startTime = Date.now()

      try {
        if (options.bypassable && args.some((arg) => arg?.force === true)) {
          const result = await originalMethod.apply(this, args)
          return result
        }

        const cachedValue = await cacheService.get(key)
        if (cachedValue !== null) {
          const hitTime = Date.now() - startTime
          stats.hits++
          stats.avgHitTime =
            (stats.avgHitTime * (stats.hits - 1) + hitTime) / stats.hits
          return cachedValue
        }

        const result = await originalMethod.apply(this, args)

        if (shouldCache(result, options)) {
          await cacheService.set(key, result, options.ttl)
        }

        const missTime = Date.now() - startTime
        stats.misses++
        stats.avgMissTime =
          (stats.avgMissTime * (stats.misses - 1) + missTime) / stats.misses

        return result
      } catch (error) {
        stats.errors++
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Generates a cache key based on the method and its arguments
 */
function generateCacheKey(
  target: any,
  propertyKey: string,
  args: any[],
  options: CacheOptions,
): string {
  const prefix = options.prefix || `${target.constructor.name}:${propertyKey}`
  const hashFunction = options.hashFunction || defaultHashFunction
  return `${prefix}:${hashFunction(args)}`
}

/**
 * Default hash function for generating cache keys
 */
function defaultHashFunction(args: any[]): string {
  return JSON.stringify(args)
}

/**
 * Determines whether a result should be cached based on the provided options
 */
function shouldCache(result: any, options: CacheOptions): boolean {
  if (options.condition && !options.condition(result)) return false
  if (options.cacheIfTruthy && !result) return false
  if (options.cacheIfHasItems && Array.isArray(result) && result.length === 0)
    return false
  if (!options.cacheNullValues && (result === null || result === undefined))
    return false
  return true
}
