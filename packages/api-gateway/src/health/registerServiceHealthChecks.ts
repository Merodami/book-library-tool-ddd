import { HealthCheckDependency, logger } from '@book-library-tool/shared'
import { Redis } from 'ioredis'

/**
 * Register health checks for backend services
 *
 * Note: This function only prepares the health check dependencies.
 * The actual registration happens via the createFastifyServer function
 * which expects the healthChecks array directly.
 */
export async function registerServiceHealthChecks(
  isLocalDev: boolean,
): Promise<HealthCheckDependency[]> {
  // Define services to check
  const serviceChecks = [
    {
      name: 'graphql-gateway',
      url: process.env.GRAPHQL_GATEWAY_HEALTH_URL ?? 'http://localhost:9668',
    },
    {
      name: 'books-service',
      url: process.env.BOOKS_API_URL ?? 'http://localhost:3001',
    },
    {
      name: 'reservations-service',
      url: process.env.RESERVATIONS_API_URL ?? 'http://localhost:3002',
    },
    {
      name: 'wallets-service',
      url: process.env.WALLETS_API_URL ?? 'http://localhost:3003',
    },
    {
      name: 'redis',
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    },
  ]

  // Create health check dependencies for each service
  const healthChecks: HealthCheckDependency[] = serviceChecks.map(
    (service) => ({
      name: service.name,
      check: async () => {
        try {
          if (service.name === 'redis') {
            const redis = new Redis(service.url)

            await redis.ping()
            await redis.quit()

            return true
          }

          const response = await fetch(`${service.url}/health/liveness`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000),
          })

          return response.ok
        } catch (error) {
          if (isLocalDev) {
            logger.warn(`${service.name} health check failed`)
            logger.warn(error)
          }

          return false
        }
      },
      details: {
        type: service.name === 'redis' ? 'Redis' : 'REST API',
        url: service.url,
      },
    }),
  )

  if (isLocalDev) {
    logger.info('Registered health checks for all backend services')
  }

  return healthChecks
}
