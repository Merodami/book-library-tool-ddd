import { ErrorCode } from '@book-library-tool/shared'
import { RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'

import { ApiGatewayConfig } from '../types/index.js'

/**
 * Creates a rate limiter middleware based on the provided configuration
 * @param config API Gateway configuration
 * @param customMessage Optional custom message for rate limit exceeded
 * @returns Express middleware for rate limiting
 */
export function createRateLimiter(
  config: ApiGatewayConfig,
  customMessage?: string | object,
): RequestHandler {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: customMessage || {
      error: {
        message: 'Rate limit exceeded',
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
      },
    },
  })
}
