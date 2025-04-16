import {
  ErrorCode,
  errorMiddleware,
  Errors,
  HealthCheck,
  logger,
} from '@book-library-tool/shared'
import express, { Express, Request, Response } from 'express'
import http from 'http'

import { loadConfig } from './config/index.js'
import { registerServiceHealthChecks } from './health/registerServiceHealthChecks.js'
import { createSecurityMiddlewares } from './middlewares/security.js'
import { setupProxyRoutes } from './routes/setupProxyRoutes.js'
import { ApiGatewayConfig } from './types/index.js'

// Determine if running in development environment
const isLocalDev = process.env.NODE_ENV === 'development'

/**
 * Start the API Gateway server
 */
async function startGateway(): Promise<http.Server> {
  const config = loadConfig()
  const app = express()

  // Basic server setup
  app.disable('x-powered-by')
  app.use(express.json())
  app.use(...createSecurityMiddlewares(config))

  // Health check initialization
  const healthCheck = new HealthCheck({
    name: 'api-gateway',
    version: process.env.APP_VERSION || '0.0.0',
    cacheTime: parseInt(process.env.HEALTHCHECK_CACHE_TIME ?? '5000', 10),
    path: config.healthCheck.path,
    logResults: isLocalDev,
  })

  // Set up routes and services
  setupHealthCheckRoutes(app, healthCheck, config)
  setupProxyRoutes(app, isLocalDev)
  await registerServiceHealthChecks(healthCheck, isLocalDev)

  // Add error handling middleware
  app.use((err: Error) => {
    logger.error('API Gateway error:', err)

    throw new Errors.ApplicationError(
      500,
      ErrorCode.INTERNAL_ERROR,
      isLocalDev ? err.message : 'An unexpected error occurred',
    )
  })

  // 404 handler for unmatched routes
  app.use((req: Request) => {
    throw new Errors.ApplicationError(
      404,
      ErrorCode.URL_NOT_FOUND,
      `The requested resource '${req.path}' was not found`,
    )
  })

  app.use(errorMiddleware)

  // Start HTTP server
  const port = parseInt(process.env.API_GATEWAY_PORT ?? '8000', 10)
  const server = app.listen(port, () => {
    logger.info(
      `API Gateway running on http://localhost:${port} (${isLocalDev ? 'local dev mode' : 'production mode'})`,
    )
    logger.info(
      `Health check available at http://localhost:${port}${config.healthCheck.path}`,
    )
  })

  // Set up graceful shutdown handlers
  setupGracefulShutdown(server)

  return server
}

/**
 * Configure health check endpoints
 */
function setupHealthCheckRoutes(
  app: Express,
  healthCheck: HealthCheck,
  config: ApiGatewayConfig,
): void {
  const healthCheckPath = config.healthCheck.path

  // Main health check endpoint
  app.get(healthCheckPath, async (_req: Request, res: Response) => {
    try {
      const health = await healthCheck.getHealth()
      const statusCode = health.status === 'unhealthy' ? 503 : 200

      res.status(statusCode).json(health)
    } catch (error) {
      logger.error('Error getting health status:', error)
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      })
    }
  })

  // Liveness probe - simple check if service is running
  app.get(`${healthCheckPath}/liveness`, (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  })

  // Readiness probe - check if service is ready to handle requests
  app.get(
    `${healthCheckPath}/readiness`,
    async (_req: Request, res: Response) => {
      try {
        const health = await healthCheck.getHealth()
        const statusCode = health.status === 'unhealthy' ? 503 : 200
        res.status(statusCode).json(health)
      } catch (error) {
        logger.error('Error getting readiness status:', error)
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        })
      }
    },
  )
}

/**
 * Configure graceful shutdown handlers
 */
function setupGracefulShutdown(server: http.Server): void {
  const shutdown = () => {
    logger.info('Shutting down API Gateway')
    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })

    // Force shutdown if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

// Auto-start in development mode
if (isLocalDev) {
  startGateway().catch((error) => {
    logger.error('Failed to start API Gateway:', error)
    process.exit(1)
  })
}

export { startGateway }
