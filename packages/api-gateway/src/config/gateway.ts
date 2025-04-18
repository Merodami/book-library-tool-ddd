import { ApiGatewayConfig } from '../types/gateway.js'

export function loadConfig(
  overrides?: Partial<ApiGatewayConfig>,
): ApiGatewayConfig {
  const config: ApiGatewayConfig = {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    },
    security: {
      enableHelmet: process.env.ENABLE_HELMET !== 'false',
      enableCors: process.env.ENABLE_CORS !== 'false',
      enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    },
    healthCheck: {
      path: process.env.HEALTH_CHECK_PATH ?? '/health',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL ?? '30000', 10),
    },
  }

  return { ...config, ...overrides }
}
