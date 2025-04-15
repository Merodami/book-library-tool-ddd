import { logger } from '@book-library-tool/shared'

import { RedisService } from './infrastructure/services/redis.js'

async function testRedis() {
  const redis = new RedisService()

  try {
    await redis.connect()
    logger.info('Connected to Redis')

    // Test set operation
    const testKey = 'test:key'
    const testValue = { message: 'Hello Redis!' }
    await redis.set(testKey, testValue)
    logger.info('Set test value:', testValue)

    // Test get operation
    const retrieved = await redis.get(testKey)
    logger.info('Retrieved value:', retrieved)

    // Check health
    const health = await redis.checkHealth()
    logger.info('Redis health:', health)

    // List all keys
    const keys = await redis.listKeys()
    logger.info('All keys in Redis:', keys)
  } catch (error) {
    logger.error('Redis test failed:', error)
  } finally {
    await redis.disconnect()
    logger.info('Disconnected from Redis')
  }
}

testRedis()
