import type { HealthCheckConfig } from '@book-library-tool/http'
import { logger } from '@book-library-tool/shared'

/**
 * Register health checks for all services
 * @param isLocalDev - Whether running in development mode
 * @returns Array of health check configurations
 */
export async function registerServiceHealthChecks(
  isLocalDev: boolean,
): Promise<HealthCheckConfig[]> {
  const healthChecks: HealthCheckConfig[] = []

  // Add health checks for each service
  const services = [
    {
      name: 'books',
      url: process.env.BOOKS_API_URL ?? 'http://localhost:3001',
    },
    {
      name: 'reservations',
      url: process.env.RESERVATIONS_API_URL ?? 'http://localhost:3002',
    },
    {
      name: 'wallets',
      url: process.env.WALLETS_API_URL ?? 'http://localhost:3003',
    },
    {
      name: 'graphql',
      url: process.env.GRAPHQL_GATEWAY_URL ?? 'http://localhost:4001',
    },
  ]

  for (const service of services) {
    healthChecks.push({
      name: `${service.name}-service`,
      check: async () => {
        try {
          const response = await fetch(`${service.url}/health`)

          return response.ok
        } catch (error) {
          if (isLocalDev) {
            logger.warn(`Health check failed for ${service.name}:`, error)
          }

          return false
        }
      },
      details: {
        type: 'Service',
        essential: true,
      },
    })
  }

  return healthChecks
}
