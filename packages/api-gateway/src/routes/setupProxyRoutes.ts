import { logger } from '@book-library-tool/shared'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

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
export function setupProxyRoutes(
  app: express.Express,
  isLocalDev: boolean,
): void {
  // Define all service routes in one place for easier management
  const serviceRoutes: ServiceRoute[] = [
    {
      path: '/graphql',
      targetUrl: process.env.GRAPHQL_GATEWAY_URL ?? 'http://localhost:4001',
      targetPath: '/',
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
  ]

  try {
    // Set up proxy for each service route
    for (const route of serviceRoutes) {
      const fullTargetUrl = `${route.targetUrl}${route.targetPath}`

      // Create the proxy middleware
      const proxy = createProxyMiddleware({
        target: fullTargetUrl,
        changeOrigin: true,
        pathRewrite: { [`^${route.path}`]: '' },
        // Basic error handling
        on: {
          error: (err, req, res) => {
            logger.error(`Proxy error for ${route.description}:`, err.message)

            if (
              res &&
              'headersSent' in res &&
              !res.headersSent &&
              'status' in res &&
              typeof res.status === 'function'
            ) {
              res.status(503).json({
                error: 'Service Unavailable',
                message: isLocalDev
                  ? `Cannot connect to ${route.description}: ${err.message}`
                  : 'Service temporarily unavailable',
              })
            }
          },
        },
      })

      // Mount the proxy
      app.use(route.path, proxy)

      // Log proxy setup in development mode
      if (isLocalDev) {
        logger.info(
          `Proxy route: ${route.path} → ${fullTargetUrl} (${route.description})`,
        )
      }
    }
  } catch (error) {
    logger.error('Failed to setup proxy routes:', error)
  }
}
