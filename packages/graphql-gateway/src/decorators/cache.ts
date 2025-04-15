import { GraphQLContext } from '../types/context.js'

/**
 * Type definitions for caching
 */
type Primitive = string | number | boolean | null | undefined
type SerializableObject = { [key: string]: Serializable }
type SerializableArray = Serializable[]
type Serializable = Primitive | SerializableArray | SerializableObject

/**
 * Options for cache behavior
 */
interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number
  /** Custom key generator function */
  keyGenerator?: (
    target: any,
    propertyKey: string | symbol,
    args: any[],
  ) => string
  /** Custom serializer for complex objects */
  serializer?: <T>(result: T) => Serializable
  /** Whether to throw on cache errors or silently fallback to original method */
  throwOnError?: boolean
}

/**
 * Checks if a value is a primitive type that can be directly serialized
 */
function isPrimitive(value: unknown): value is Primitive {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Checks if a value is serializable to JSON
 */
function isSerializable(value: unknown): value is Serializable {
  if (isPrimitive(value)) return true

  if (Array.isArray(value)) {
    return value.every(isSerializable)
  }

  if (value && typeof value === 'object') {
    if (value instanceof Date) return true
    if (value instanceof Map || value instanceof Set) return false

    // Use a safer iteration method with Object.entries
    return Object.entries(value).every(([_key, val]) => isSerializable(val))
  }

  return false
}

/**
 * Default key generator for cache keys
 */
function defaultKeyGenerator(
  target: any,
  propertyKey: string | symbol,
  args: any[],
): string {
  // Only use the first two arguments for cache key (typically parent and params)
  const parent = args.length > 0 ? args[0] : undefined
  const params = args.length > 1 ? args[1] : undefined
  const className = target.constructor.name
  const methodName = String(propertyKey)

  // Create a unique key based on class, method, and arguments
  return `cache:${className}:${methodName}:${JSON.stringify({ parent, params })}`
}

/**
 * Default serializer for results to be cached
 */
function defaultSerializer<T>(result: T): Serializable {
  if (result === undefined) return null

  if (isSerializable(result)) {
    return result
  }

  if (Array.isArray(result)) {
    return result.map(defaultSerializer)
  }

  if (result && typeof result === 'object') {
    if (result instanceof Date) {
      return result.toISOString()
    }

    const serialized: Record<string, Serializable> = {}
    const entries = Object.entries(result)

    for (const [key, value] of entries) {
      if (isSerializable(value)) {
        Object.defineProperty(serialized, key, {
          value: value,
          enumerable: true,
          writable: true,
          configurable: true,
        })
      } else {
        Object.defineProperty(serialized, key, {
          value: defaultSerializer(value),
          enumerable: true,
          writable: true,
          configurable: true,
        })
      }
    }

    return serialized
  }

  // Return null for non-serializable values
  return null
}

/**
 * Cache decorator for class methods
 *
 * This decorator caches method results in Redis.
 * It extracts the RedisService from the GraphQLContext argument.
 *
 * @param options - The cache options (ttl, keyGenerator, serializer, throwOnError)
 * @returns A method decorator function
 */
export function Cache(options?: number | CacheOptions) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value
    const cacheOptions: CacheOptions =
      typeof options === 'number' ? { ttl: options } : options || {}
    const {
      ttl,
      keyGenerator = defaultKeyGenerator,
      serializer = defaultSerializer,
      throwOnError = false,
    } = cacheOptions

    descriptor.value = async function (...args: any[]) {
      const context = args[args.length - 1] as GraphQLContext
      if (!context?.redisService) {
        console.log(
          `[Cache] Redis not available, skipping cache for ${String(propertyKey)}`,
        )
        return originalMethod.apply(this, args)
      }

      const cacheKey = keyGenerator(target, propertyKey, args)
      console.log(`[Cache] Checking cache for key: ${cacheKey}`)

      try {
        const cachedValue = await context.redisService.get<string>(cacheKey)
        if (cachedValue) {
          console.log(`[Cache] Cache HIT for key: ${cacheKey}`)
          return JSON.parse(cachedValue)
        }

        console.log(`[Cache] Cache MISS for key: ${cacheKey}`)
        const result = await originalMethod.apply(this, args)
        const serializedResult = serializer(result)

        if (serializedResult !== undefined) {
          await context.redisService.set(
            cacheKey,
            JSON.stringify(serializedResult),
            ttl || 3600,
          )
          console.log(
            `[Cache] Cached result for key: ${cacheKey} with TTL: ${ttl || 3600}s`,
          )
        }

        return result
      } catch (error) {
        console.error(
          `[Cache] Error in cache decorator for ${String(propertyKey)}:`,
          error,
        )
        if (throwOnError) {
          throw error
        }
        return originalMethod.apply(this, args)
      }
    }

    return descriptor
  }
}

/**
 * Invalidates cache entries related to a specific method
 *
 * @param target - The class containing the method
 * @param propertyKey - The method name
 * @param context - The GraphQL context containing RedisService
 * @param pattern - Optional pattern to match specific keys (default: all keys for the method)
 */
export async function invalidateCache(
  target: any,
  propertyKey: string | symbol,
  context: GraphQLContext,
  pattern?: string,
): Promise<void> {
  try {
    const { redisService } = context

    if (!redisService) {
      throw new Error('RedisService not found in context')
    }

    const className = target.constructor.name
    const methodName = String(propertyKey)
    const cachePattern = pattern || `cache:${className}:${methodName}:*`

    await redisService.delPattern(cachePattern)
  } catch (error) {
    console.error(`Error invalidating cache for ${String(propertyKey)}:`, error)
    throw error
  }
}

/**
 * Helper utility to clear all cache for a given class
 *
 * @param target - The class whose cache should be cleared
 * @param context - The GraphQL context containing RedisService
 */
export async function clearClassCache(
  target: any,
  context: GraphQLContext,
): Promise<void> {
  try {
    const { redisService } = context

    if (!redisService) {
      throw new Error('RedisService not found in context')
    }

    const className = target.constructor.name
    await redisService.delPattern(`cache:${className}:*`)
  } catch (error) {
    console.error(
      `Error clearing class cache for ${target.constructor.name}:`,
      error,
    )
    throw error
  }
}
