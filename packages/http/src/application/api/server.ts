import { logger } from '@book-library-tool/shared'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import closeWithGrace from 'close-with-grace'
import { FastifyInstance } from 'fastify'
import Fastify from 'fastify'

import { ServerOptions } from '../../domain/types/server.js'
import { fastifyAuth } from '../../infrastructure/fastify/middleware/auth.js'
import { fastifyErrorMiddleware } from '../../infrastructure/fastify/middleware/errorHandler.js'
import { setupServiceHealthCheck } from './healthCheck.js'

/**
 * Creates and configures a Fastify server with standard middleware and configuration.
 *
 * @param options - Server configuration options
 * @returns Configured Fastify instance
 */
export async function createFastifyServer(
  options: ServerOptions,
): Promise<FastifyInstance> {
  // Initialize the Fastify application with enterprise-grade configuration
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    trustProxy: true,
    disableRequestLogging: process.env.NODE_ENV === 'production',
  })

  // Add cache service to the app instance if provided
  if (options.cacheService) {
    app.decorate('cacheService', options.cacheService)
  }

  // Register core plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  })

  await app.register(fastifyCors, {
    exposedHeaders: ['Date', 'Content-Disposition'],
  })

  await app.register(fastifyRateLimit, {
    max:
      options.rateLimit?.max ||
      parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    timeWindow: options.rateLimit?.timeWindow || '1 minute',
  })

  // Register authentication plugin
  await app.register(fastifyAuth, {
    secret: options.jwtSecret || process.env.JWT_SECRET || 'default-secret',
    excludePaths: ['/health', '/health/details'],
  })

  // Setup health check endpoints
  setupServiceHealthCheck(app, options.healthChecks, {
    serviceName: options.serviceName,
  })

  // Register error middleware
  app.register(fastifyErrorMiddleware, {
    enableStackTrace: process.env.NODE_ENV !== 'production',
  })

  return app
}

/**
 * Starts the server and sets up graceful shutdown
 *
 * @param app - Configured Fastify instance
 * @param port - Port to listen on
 * @param shutdownHandlers - Custom shutdown handlers
 */
export async function startServer(
  app: FastifyInstance,
  port: number,
  shutdownHandlers?: {
    onShutdown?: () => Promise<void>
    onUnhandledRejection?: (reason: any) => void
  },
): Promise<void> {
  try {
    await app.listen({ port, host: '0.0.0.0' })

    logger.info(`App listening on port ${port}`)
    logger.info(`Health check available at http://localhost:${port}/health`)
  } catch (err) {
    logger.error('Error starting server:', err)
    process.exit(1)
  }

  // Configure graceful shutdown to close connections gracefully.
  closeWithGrace(
    {
      delay: 10000,
    },
    async ({ signal, err }) => {
      if (err) {
        logger.error(`Error during shutdown: ${err.message}`)
      }

      logger.info(`Received ${signal}, shutting down gracefully`)

      // Close Fastify server first to stop accepting new connections
      await app.close()
      logger.info('Server closed')

      // Execute custom shutdown logic if provided
      if (shutdownHandlers?.onShutdown) {
        await shutdownHandlers.onShutdown()
      }

      logger.info('Server gracefully shut down.')
    },
  )

  // Set up unhandled rejection handler
  process.on('unhandledRejection', (reason) => {
    if (shutdownHandlers?.onUnhandledRejection) {
      shutdownHandlers.onUnhandledRejection(reason)
    } else {
      logger.error(`Unhandled Promise Rejection: ${reason}`)
    }
  })
}
