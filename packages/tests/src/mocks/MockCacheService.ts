import { HealthStatus, ICacheService } from '@book-library-tool/redis'
import { vi } from 'vitest'

/**
 * Sample cached items for testing. Override per-test if needed.
 */
export const sampleCachedItems: Record<string, any> = {
  'books:getBook:book-123': {
    id: 'book-123',
    title: 'Sample Book',
    author: 'Sample Author',
  },
  'catalog:getAllBooks:1': [
    { id: 'book-123', title: 'Sample Book 1' },
    { id: 'book-456', title: 'Sample Book 2' },
  ],
}

/**
 * Creates an in-memory mock of ICacheService.
 * Useful for testing components that depend on caching
 * without requiring a real Redis connection.
 *
 * @param initialCache - Optional starting cache data; defaults to sampleCachedItems
 * @returns A mock implementation of the ICacheService interface
 */
export function createMockCacheService(
  initialCache?: Record<string, any>,
): ICacheService {
  const cache = new Map(Object.entries(initialCache ?? sampleCachedItems))
  const ttls = new Map<string, number>()
  const defaultTTL = 3600

  // Mock implementation
  const mockCacheService = {
    /**
     * Mocks connecting to the cache service.
     */
    connect: vi.fn().mockImplementation(async () => {
      return Promise.resolve()
    }),

    /**
     * Mocks disconnecting from the cache service.
     */
    disconnect: vi.fn().mockImplementation(async () => {
      return Promise.resolve()
    }),

    /**
     * Mocks retrieving a value from the cache.
     *
     * @param key - The key to retrieve
     * @returns The cached value or null if not found
     */
    get: vi
      .fn()
      .mockImplementation(async <T>(key: string): Promise<T | null> => {
        if (cache.has(key)) {
          return Promise.resolve(cache.get(key) as T)
        }

        return Promise.resolve(null)
      }),

    /**
     * Mocks storing a value in the cache.
     *
     * @param key - The key to store the value under
     * @param value - The value to store
     * @param ttl - Time to live in seconds (optional)
     * @returns True indicating success
     */
    set: vi
      .fn()
      .mockImplementation(
        async (
          key: string,
          value: unknown,
          ttl: number = defaultTTL,
        ): Promise<boolean> => {
          cache.set(key, value)
          ttls.set(key, ttl)

          return Promise.resolve(true)
        },
      ),

    /**
     * Mocks checking if a key exists in the cache.
     *
     * @param key - The key to check
     * @returns True if the key exists
     */
    exists: vi
      .fn()
      .mockImplementation(async (key: string): Promise<boolean> => {
        return Promise.resolve(cache.has(key))
      }),

    /**
     * Mocks getting the remaining time to live for a key.
     *
     * @param key - The key to check
     * @returns TTL value or -2 if key doesn't exist, -1 if no TTL
     */
    getTTL: vi.fn().mockImplementation(async (key: string): Promise<number> => {
      if (!cache.has(key)) {
        return Promise.resolve(-2) // Key doesn't exist
      }

      return Promise.resolve(ttls.get(key) ?? -1) // Return TTL or -1 if no TTL
    }),

    /**
     * Mocks updating the time to live for a key.
     *
     * @param key - The key to update
     * @param ttl - New time to live in seconds
     * @returns True if the key exists and TTL was updated
     */
    updateTTL: vi
      .fn()
      .mockImplementation(
        async (key: string, ttl: number): Promise<boolean> => {
          if (cache.has(key)) {
            ttls.set(key, ttl)

            return Promise.resolve(true)
          }

          return Promise.resolve(false)
        },
      ),

    /**
     * Mocks deleting a key from the cache.
     *
     * @param key - The key to delete
     * @returns True if the key was deleted
     */
    del: vi.fn().mockImplementation(async (key: string): Promise<boolean> => {
      const existed = cache.has(key)

      cache.delete(key)
      ttls.delete(key)

      return existed
    }),

    /**
     * Mocks deleting all keys matching a pattern.
     *
     * @param pattern - The pattern to match keys against
     * @returns The number of keys deleted
     */
    delPattern: vi
      .fn()
      .mockImplementation(async (pattern: string): Promise<number> => {
        const regex = new RegExp(pattern.replace('*', '.*'))

        let count = 0

        for (const key of cache.keys()) {
          if (regex.test(key)) {
            cache.delete(key)
            ttls.delete(key)
            count++
          }
        }

        return count
      }),

    /**
     * Mocks clearing all keys from the cache.
     */
    clearAll: vi.fn().mockImplementation(async (): Promise<void> => {
      cache.clear()
      ttls.clear()
    }),

    /**
     * Mocks checking the health of the cache service.
     * (Extension from the Redis implementation)
     */
    checkHealth: vi.fn().mockImplementation(async (): Promise<HealthStatus> => {
      return Promise.resolve({
        status: 'healthy',
        details: {
          connection: true,
          latency: 1,
          errors: 0,
        },
      })
    }),

    // Non-interface methods added for Redis-specific functionality
    /**
     * Mocks listing all keys matching a pattern.
     * (Extension from the Redis implementation)
     *
     * @param pattern - The pattern to match keys against
     * @returns Array of matching keys
     */
    listKeys: vi
      .fn()
      .mockImplementation(async (pattern: string = '*'): Promise<string[]> => {
        const regex = new RegExp(pattern.replace('*', '.*'))

        return Promise.resolve(
          Array.from(cache.keys()).filter((key) => regex.test(key)),
        )
      }),

    /**
     * Mocks Redis SETEX operation.
     * (Extension from the Redis implementation)
     */
    setex: vi
      .fn()
      .mockImplementation(
        async (key: string, ttl: number, value: string): Promise<string> => {
          cache.set(key, value)
          ttls.set(key, ttl)

          return Promise.resolve('OK')
        },
      ),

    /**
     * Mocks Redis INCR operation.
     * (Extension from the Redis implementation)
     */
    incr: vi.fn().mockImplementation(async (key: string): Promise<number> => {
      if (!cache.has(key)) {
        cache.set(key, 0)
      }

      if (typeof cache.get(key) === 'number') {
        cache.set(key, cache.get(key) + 1)
      } else {
        cache.set(key, 1)
      }

      return Promise.resolve(cache.get(key))
    }),

    // For testing
    /**
     * Get the current state of the cache (for assertions)
     */
    __getCache: () => ({ ...Object.fromEntries(cache) }),

    /**
     * Get the current TTLs (for assertions)
     */
    __getTTLs: () => ({ ...Object.fromEntries(ttls) }),
  }

  return mockCacheService
}

/**
 * Helper to access the cache state for assertions.
 *
 * @param mockCache The mock cache service
 * @returns Current state of the cache
 */
export function getCacheState(mockCache: ICacheService): Record<string, any> {
  return (mockCache as any).__getCache?.() || {}
}

/**
 * Helper to access the TTL state for assertions.
 *
 * @param mockCache The mock cache service
 * @returns Current TTL values
 */
export function getTTLState(mockCache: ICacheService): Record<string, number> {
  return (mockCache as any).__getTTLs?.() || {}
}

/**
 * Clears call history on all mock methods.
 * Call in your test's beforeEach() to isolate invocations.
 *
 * @param cacheService The mock cache service to reset
 */
export function resetMockCacheService(cacheService: ICacheService): void {
  for (const fn of [
    cacheService.connect,
    cacheService.disconnect,
    cacheService.get,
    cacheService.set,
    cacheService.exists,
    cacheService.getTTL,
    cacheService.updateTTL,
    cacheService.del,
    cacheService.delPattern,
    cacheService.clearAll,
    (cacheService as any).checkHealth,
    (cacheService as any).listKeys,
  ]) {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      vi.mocked(fn).mockClear()
    }
  }
}

/**
 * Convenience: a cache service mock with no initial data.
 *
 * @returns A fresh mock cache service with empty cache
 */
export function createEmptyMockCacheService(): ICacheService {
  return createMockCacheService({})
}

/**
 * Convenience: a cache service mock whose methods always reject.
 * Useful for testing error handling paths.
 *
 * @param errorMessage Custom error message to use
 * @returns Cache service mock that rejects operations
 */
export function createErrorMockCacheService(
  errorMessage = 'Mock cache service error',
): ICacheService {
  const err = new Error(errorMessage)

  return {
    connect: vi.fn().mockRejectedValue(err),
    disconnect: vi.fn().mockRejectedValue(err),
    get: vi.fn().mockRejectedValue(err),
    set: vi.fn().mockRejectedValue(err),
    exists: vi.fn().mockRejectedValue(err),
    getTTL: vi.fn().mockRejectedValue(err),
    updateTTL: vi.fn().mockRejectedValue(err),
    del: vi.fn().mockRejectedValue(err),
    delPattern: vi.fn().mockRejectedValue(err),
    clearAll: vi.fn().mockRejectedValue(err),
  } as ICacheService
}
