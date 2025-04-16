import { logger } from '@book-library-tool/shared'
import { Express } from 'express'
import {
  createProxyMiddleware,
  Options as ProxyOptions,
} from 'http-proxy-middleware'

// Type definition for service route configuration
interface ServiceRoute {
  path: string
  target: string
  pathRewrite?: Record<string, string>
  additionalOptions?: Partial<ProxyOptions>
}

/**
 * Set up proxy routes to backend services
 */
export function setupProxyRoutes(app: Express, isLocalDev: boolean): void {
  // Define service routes
  const serviceRoutes: ServiceRoute[] = [
    {
      path: '/graphql',
      target: process.env.GRAPHQL_GATEWAY_URL ?? 'http://localhost:4000',
    },
    {
      path: '/api/books',
      target: process.env.BOOKS_API_URL ?? 'http://localhost:3001',
      pathRewrite: {
        '^/api/books': '/books',
      },
    },
    {
      path: '/api/catalog',
      target: process.env.CATALOG_API_URL ?? 'http://localhost:3001',
      pathRewrite: {
        '^/api/catalog': '/catalog',
      },
    },
    {
      path: '/api/reservations',
      target: process.env.RESERVATIONS_API_URL ?? 'http://localhost:3002',
      pathRewrite: {
        '^/api/reservations': '/reservations',
      },
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
        // Forward all headers from the original request
        req.headers = {
          ...req.headers,
        }

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
        logger.info('Path rewrite:', route.pathRewrite)
      }
    } catch (error) {
      logger.error(`Failed to setup proxy for ${route.path}:`, error)
    }
  }
}
