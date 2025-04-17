import { logger } from '@book-library-tool/shared'
import httpProxy from '@fastify/http-proxy'
import type { FastifyInstance } from 'fastify'

/**
 * Simple service route configuration
 */
interface ServiceRoute {
  path: string
  targetUrl: string
  targetPath: string
  description: string
}

/**
 * Set up proxy routes to backend services
 */
export async function setupProxyRoutes(
  app: FastifyInstance,
  isLocalDev: boolean,
): Promise<void> {
  // Define all service routes in one place for easier management
  const serviceRoutes: ServiceRoute[] = [
    {
      path: '/graphql',
      targetUrl: process.env.GRAPHQL_GATEWAY_URL ?? 'http://localhost:4001',
      targetPath: '/graphql',
      description: 'GraphQL API',
    },
    {
      path: '/api/books',
      targetUrl: process.env.BOOKS_API_URL ?? 'http://localhost:3001',
      targetPath: '/books',
      description: 'Books Service',
    },
    {
      path: '/api/catalog',
      targetUrl: process.env.CATALOG_API_URL ?? 'http://localhost:3001',
      targetPath: '/catalog',
      description: 'Catalog Service',
    },
    {
      path: '/api/reservations',
      targetUrl: process.env.RESERVATIONS_API_URL ?? 'http://localhost:3002',
      targetPath: '/reservations',
      description: 'Reservations Service',
    },
    {
      path: '/api/wallets',
      targetUrl: process.env.WALLETS_API_URL ?? 'http://localhost:3003',
      targetPath: '/wallets',
      description: 'Wallets Service',
    },
  ]

  try {
    // Set up proxy for each service route
    for (const route of serviceRoutes) {
      // Register the proxy plugin for this route with proper typing
      await app.register(httpProxy, {
        upstream: route.targetUrl,
        prefix: route.path,
        rewritePrefix: route.targetPath,
        httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        proxyPayloads: true,
        replyOptions: {
          rewriteRequestHeaders: (req, headers) => ({
            ...headers,
            'x-forwarded-host': req.headers.host || 'localhost',
            'x-forwarded-prefix': route.path,
          }),
        },
      })

      // Log proxy setup in development mode
      if (isLocalDev) {
        logger.info(
          `Proxy route: ${route.path} → ${route.targetUrl}${route.targetPath} (${route.description})`,
        )
      }
    }
  } catch (error) {
    logger.error('Failed to setup proxy routes:', error)
    throw error // Re-throw to ensure the server knows setup failed
  }
}
