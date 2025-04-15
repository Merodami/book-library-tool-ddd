import { Cache } from './application/decorators/cache.js'
import { CacheService } from './domain/repositories/cache.js'
import { CacheOptions, CacheStats } from './domain/types.js'
import { MemoryCacheService } from './infrastructure/cache/memory.js'
import { RedisConfigService } from './infrastructure/config/redis.config.js'
import { RedisService } from './infrastructure/services/redis.js'

export { Cache, MemoryCacheService, RedisConfigService, RedisService }
export type { CacheOptions, CacheService, CacheStats }
