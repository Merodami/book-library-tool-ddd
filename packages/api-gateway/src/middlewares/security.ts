import compression from 'compression'
import cors from 'cors'
import { RequestHandler } from 'express'
import helmet from 'helmet'

import { ApiGatewayConfig } from '../types/index.js'

/**
 * Creates CORS middleware with default configuration
 * @param options Optional CORS options override
 * @returns CORS middleware
 */
export function createCorsMiddleware(
  options?: cors.CorsOptions,
): RequestHandler {
  return cors(
    options || {
      exposedHeaders: ['Date', 'Content-Disposition'],
      credentials: true,
    },
  )
}

/**
 * Creates helmet middleware for security headers
 * @param options Optional helmet options override
 * @returns Helmet middleware
 */
export function createHelmetMiddleware(
  options?: Parameters<typeof helmet>[0],
): RequestHandler {
  return helmet(options)
}

/**
 * Creates compression middleware
 * @param options Optional compression options
 * @returns Compression middleware
 */
export function createCompressionMiddleware(
  options?: compression.CompressionOptions,
): RequestHandler {
  return compression(options)
}

/**
 * Creates all security middlewares based on configuration
 * @param config API Gateway configuration
 * @returns Array of middleware functions
 */
export function createSecurityMiddlewares(
  config: ApiGatewayConfig,
): RequestHandler[] {
  const middlewares: RequestHandler[] = []

  if (config.security.enableHelmet) {
    middlewares.push(createHelmetMiddleware())
  }

  if (config.security.enableCors) {
    middlewares.push(createCorsMiddleware())
  }

  if (config.security.enableCompression) {
    middlewares.push(createCompressionMiddleware())
  }

  return middlewares
}
