import { createFastifyServer, startServer } from '@book-library-tool/http'
import { logger } from '@book-library-tool/shared'
import type { FastifyInstance } from 'fastify'

import { loadConfig } from '../../config/gateway.js'
import { registerServiceHealthChecks } from '../../health/registerServiceHealthChecks.js'
import { setupProxyRoutes } from './routes/setupProxyRoutes.js'

// Determine if running in development environment
const isLocalDev = process.env.NODE_ENV === 'development'

/**
 * Start the API Gateway server
 */
async function startGateway(): Promise<FastifyInstance> {
  const config = loadConfig()

  // Create server with standard configuration
  const port = parseInt(process.env.API_GATEWAY_PORT ?? '8000', 10)

  // Get health check dependencies from services
  // We need to convert each check function to always return a Promise<boolean>
  // and ensure details has the correct format
  const serviceHealthChecks = await registerServiceHealthChecks(isLocalDev)

  const healthChecks = serviceHealthChecks.map((dep) => ({
    name: dep.name,
    check: async () => {
      const result = await Promise.resolve(dep.check())
      return result
    },
    details: {
      type: dep.details?.type || 'Service',
      essential: dep.details?.essential || false,
    },
  }))

  const app = await createFastifyServer({
    serviceName: 'api-gateway',
    port,
    healthChecks,
    rateLimit: {
      max: config.rateLimit.max,
      timeWindow: `${config.rateLimit.windowMs}ms`,
    },
  })

  // Set up proxy routes
  await setupProxyRoutes(app, isLocalDev)

  // Start the server
  await startServer(app, port, {
    onShutdown: async () => {
      logger.info('API Gateway shutdown complete')
    },
    onUnhandledRejection: (reason) => {
      logger.error('Unhandled Promise Rejection in API Gateway:', reason)
    },
  })

  return app
}

// Auto-start in development mode
if (isLocalDev) {
  startGateway().catch((error) => {
    logger.error('Failed to start API Gateway:', error)

    process.exit(1)
  })
}

export { startGateway }
