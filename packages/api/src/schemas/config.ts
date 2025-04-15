import { Static, Type } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'

/**
 * Configuration Schema for the application
 */
export const ConfigSchema = Type.Object({
  port: Type.Number({ default: 4000 }),
  environment: Type.Union(
    [
      Type.Literal('development'),
      Type.Literal('production'),
      Type.Literal('test'),
    ],
    { default: 'development' },
  ),
  rateLimit: Type.Object({
    windowMs: Type.Number({ default: 15 * 60 * 1000 }), // 15 minutes
    max: Type.Number({ default: 100 }), // limit each IP to 100 requests per windowMs
  }),
  complexity: Type.Object({
    maxComplexity: Type.Number({ default: 100 }),
    defaultFieldComplexity: Type.Number({ default: 1 }),
    listFieldMultiplier: Type.Number({ default: 2 }),
    fieldWeights: Type.Record(Type.String(), Type.Number(), {
      default: {
        books: 2,
        reservations: 3,
        user: 1,
      },
    }),
  }),
  healthCheck: Type.Object({
    path: Type.String({ default: '/health' }),
    interval: Type.Number({ default: 30000 }), // 30 seconds
  }),
  redis: Type.Object({
    host: Type.String({ default: 'localhost' }),
    port: Type.Number({ default: 6379 }),
    defaultTTL: Type.Number({ default: 3600 }), // 1 hour
  }),
})

export type Config = Static<typeof ConfigSchema>

// Create a type compiler for validation
const compiler = TypeCompiler.Compile(ConfigSchema)

/**
 * Loads and validates the configuration from environment variables
 */
export function loadConfig(): Config {
  try {
    const config = {
      port: parseInt(process.env.PORT || '4000', 10),
      environment: process.env.NODE_ENV || 'development',
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
      complexity: {
        maxComplexity: parseInt(process.env.MAX_COMPLEXITY || '100', 10),
        defaultFieldComplexity: parseInt(
          process.env.DEFAULT_FIELD_COMPLEXITY || '1',
          10,
        ),
        listFieldMultiplier: parseInt(
          process.env.LIST_FIELD_MULTIPLIER || '2',
          10,
        ),
        fieldWeights: JSON.parse(
          process.env.FIELD_WEIGHTS || '{"books":2,"reservations":3,"user":1}',
        ),
      },
      healthCheck: {
        path: process.env.HEALTH_CHECK_PATH || '/health',
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
      },
    }

    // Validate against schema
    if (!compiler.Check(config)) {
      throw new Error('Invalid configuration')
    }

    return config as Config
  } catch (error) {
    console.error('Configuration validation failed:', error)
    throw new Error('Invalid configuration')
  }
}
