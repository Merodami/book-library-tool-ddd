import { HealthCheck, logger } from '@book-library-tool/shared'

/**
 * Register health checks for backend services
 */
export async function registerServiceHealthChecks(
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
      url: process.env.RESERVATIONS_API_URL ?? 'http://localhost:3002',
    },
    {
      name: 'wallets-service',
      url: process.env.WALLETS_API_URL ?? 'http://localhost:3003',
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
          logger.warn(error)
        }

        return false
      }
    })
  }
}
