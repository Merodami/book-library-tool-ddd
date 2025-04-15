// api-gateway/src/index.ts
import { HealthCheck, logger } from '@book-library-tool/shared'
import express, { Express, NextFunction, Request, Response } from 'express'
import http from 'http'
import {
  createProxyMiddleware,
  Options as ProxyOptions,
} from 'http-proxy-middleware'

import { loadConfig } from './config/index.js'
import { createSecurityMiddlewares } from './middlewares/security.js'
import { ApiGatewayConfig } from './types/index.js'

// Determine if running in development environment
const isLocalDev = process.env.NODE_ENV === 'development'

// Type definition for service route configuration
interface ServiceRoute {
  path: string
  target: string
  pathRewrite?: Record<string, string>
  additionalOptions?: Partial<ProxyOptions>
}

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
    version: process.env.npm_package_version || '1.0.0',
    cacheTime: parseInt(process.env.HEALTHCHECK_CACHE_TIME ?? '5000', 10),
    path: config.healthCheck.path,
    logResults: isLocalDev,
  })

  // Set up routes and services
  setupHealthCheckRoutes(app, healthCheck, config)
  setupProxyRoutes(app, isLocalDev)
  await registerServiceHealthChecks(healthCheck, isLocalDev)

  // Add error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('API Gateway error:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: isLocalDev ? err.message : 'An unexpected error occurred',
    })
  })

  // 404 handler for unmatched routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `The requested resource '${req.path}' was not found`,
    })
  })

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
 * Set up proxy routes to backend services
 */
function setupProxyRoutes(app: Express, isLocalDev: boolean): void {
  // Define service routes
  const serviceRoutes: ServiceRoute[] = [
    {
      path: '/graphql',
      target: process.env.GRAPHQL_GATEWAY_URL ?? 'http://localhost:4000',
    },
    {
      path: '/api/books',
      target: process.env.BOOKS_API_URL ?? 'http://localhost:3001',
      pathRewrite: { '^/api/books': '/books' },
    },
    {
      path: '/api/reservations',
      target: process.env.RESERVATIONS_SERVICE_URL ?? 'http://localhost:3002',
      pathRewrite: { '^/api/reservations': '/reservations' },
    },
  ]

  // Create proxy for each service
  for (const route of serviceRoutes) {
    try {
      // Fix: Use proper type definitions for proxy options
      const options: ProxyOptions = {
        target: route.target,
        changeOrigin: true,
        pathRewrite: route.pathRewrite,
        ...route.additionalOptions,
        // Remove the onError handler and use a middleware for error handling instead
      }

      const proxyMiddleware = createProxyMiddleware(options)

      // Add error handling middleware after proxy
      app.use(route.path, (req, res, next) => {
        proxyMiddleware(req, res, (err) => {
          if (err) {
            logger.error(`Proxy error for ${route.path}:`, err)
            if (!res.headersSent) {
              res.status(500).json({
                error: 'Service Unavailable',
              })
            }
            return
          }
          next()
        })
      })

      if (isLocalDev) {
        logger.info(`Proxy route: ${route.path} → ${route.target}`)
      }
    } catch (error) {
      logger.error(`Failed to setup proxy for ${route.path}:`, error)
    }
  }
}

/**
 * Register health checks for backend services
 */
async function registerServiceHealthChecks(
  healthCheck: HealthCheck,
  isLocalDev: boolean,
): Promise<void> {
  // Define services to check
  const serviceChecks = [
    {
      name: 'graphql-gateway',
      url: process.env.GRAPHQL_GATEWAY_URL ?? 'http://localhost:4000',
    },
    {
      name: 'books-service',
      url: process.env.BOOKS_API_URL ?? 'http://localhost:3001',
    },
    {
      name: 'reservations-service',
      url: process.env.RESERVATIONS_SERVICE_URL ?? 'http://localhost:3002',
    },
  ]

  // Register each service health check
  for (const service of serviceChecks) {
    healthCheck.register(service.name, async () => {
      try {
        const response = await fetch(`${service.url}/health/liveness`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000),
        })
        return response.ok
      } catch (error) {
        if (isLocalDev) {
          logger.warn(`${service.name} health check failed`)
        }
        return false
      }
    })
  }
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
