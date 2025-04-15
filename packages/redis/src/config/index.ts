interface RedisConfig {
  host: string
  port: number
  defaultTTL: number
}

export function loadConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL ?? '3600', 10), // 1 hour
  }
}
