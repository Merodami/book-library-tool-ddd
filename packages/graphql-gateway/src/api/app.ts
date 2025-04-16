// graphql-gateway/api/app.ts
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ExpressContextFunctionArgument } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { RedisService } from '@book-library-tool/redis'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import cors from 'cors'
import express, { RequestHandler } from 'express'
import http from 'http'
import gracefulShutdown from 'http-graceful-shutdown'
import os from 'os'

import { loadConfig } from '../config/index.js'
import { BookLoader } from '../loaders/BookLoader.js'
import { plugins } from '../middleware/index.js'
import { BooksService } from '../modules/books/index.js'
import { createResolvers as createBooksResolvers } from '../modules/books/index.js'
import { typeDefs as booksTypeDefs } from '../modules/books/schema.js'
import { createResolvers as createReservationsResolvers } from '../modules/reservations/resolvers.js'
import { typeDefs as reservationsTypeDefs } from '../modules/reservations/schema.js'
import { ReservationsService } from '../modules/reservations/service.js'
import { baseTypeDefs } from '../schema/base.js'
import { GraphQLContext } from '../types/context.js'
import { setupServiceHealthCheck } from './healthcheck.js'

interface ServerResult {
  httpServer: http.Server
  app: express.Express
}

async function startServer(): Promise<ServerResult> {
  logger.info('Starting GraphQL server')

  // Load configuration
  const graphqlConfig = loadConfig()

  // Create Express app directly (don't use ApiGateway)
  const app = express()

  // Apply standard middleware
  app.disable('x-powered-by')
  app.use(express.json())
  app.use(cors())

  // Initialize Redis Service
  logger.info('Initializing Redis service...')

  const redisService = new RedisService({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL ?? '3600', 10),
  })

  try {
    logger.info('Connecting to Redis...')

    await redisService.connect()

    logger.info('Redis connection established successfully')
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    // Continue without Redis (service will be degraded)
  }

  // Create service clients
  const booksService = new BooksService()
  const reservationsService = new ReservationsService()
  const bookLoader = new BookLoader()

  // Setup health checks specific to GraphQL Gateway
  setupServiceHealthCheck(
    app,
    [
      {
        name: 'system',
        check: async () => {
          const loadAvg = os.loadavg()[0]
          const cpuCount = os.cpus().length

          return loadAvg < cpuCount
        },
        details: {
          type: 'System Resources',
          essential: false,
        },
      },
      {
        name: 'redis',
        check: async () => {
          try {
            const health = await redisService.checkHealth()

            return health.status === 'healthy' || health.status === 'degraded'
          } catch (error) {
            logger.warn('Redis service health check failed:', error)

            return false
          }
        },
        details: {
          type: 'Redis',
          essential: true,
        },
      },
      {
        name: 'books-service',
        check: async () => {
          try {
            const response = await fetch(
              `${process.env.BOOKS_API_URL ?? 'http://localhost:3001'}/health/liveness`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(3000), // 3 second timeout
              },
            )

            return response.ok
          } catch (error) {
            logger.warn('Books service health check failed:', error)

            return false
          }
        },
        details: {
          type: 'Dependent Service',
          essential: true,
        },
      },
      {
        name: 'reservations-service',
        check: async () => {
          try {
            const response = await fetch(
              `${process.env.RESERVATIONS_API_URL ?? 'http://localhost:3002'}/health/liveness`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(3000),
              },
            )

            return response.ok
          } catch (error) {
            logger.warn('Reservations service health check failed:', error)
            return false
          }
        },
        details: {
          type: 'Dependent Service',
          essential: true,
        },
      },
      {
        name: 'wallet-service',
        check: async () => {
          const response = await fetch(
            `${process.env.WALLET_API_URL ?? 'http://localhost:3003'}/health/liveness`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000),
            },
          )

          return response.ok
        },
        details: {
          type: 'Dependent Service',
          essential: true,
        },
      },
    ],
    {
      serviceName: 'graphql-gateway',
      healthPath: process.env.HEALTH_CHECK_PATH ?? '/health',
    },
  )

  // Create HTTP server
  const httpServer = http.createServer(app)

  // Merge all type definitions
  const typeDefs = mergeTypeDefs([
    baseTypeDefs,
    booksTypeDefs,
    reservationsTypeDefs,
  ])

  // Create resolvers
  const booksResolvers = createBooksResolvers()
  const reservationsResolvers = createReservationsResolvers()

  // Create combined resolvers
  const resolvers = {
    Query: {
      ...(booksResolvers.Query || {}),
      ...(reservationsResolvers.Query || {}),
    },
    Mutation: {
      ...(booksResolvers.Mutation || {}),
      ...(reservationsResolvers.Mutation || {}),
    },
  }

  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  })

  // Create Apollo Server with GraphQL complexity settings
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ...(plugins as any[]),
    ],
    introspection: graphqlConfig.environment !== 'production',
  })

  // Start Apollo Server
  await server.start()

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }: ExpressContextFunctionArgument) => ({
        req: req as unknown as GraphQLContext['req'],
        booksService,
        reservationsService,
        bookLoader,
        redisService,
      }),
    }) as unknown as RequestHandler,
  )

  // Add error handling middleware
  app.use(errorMiddleware)

  // Start the HTTP server
  const SERVER_PORT =
    graphqlConfig.port ||
    parseInt(process.env.GRAPHQL_SERVER_PORT ?? '4000', 10)

  httpServer.listen(SERVER_PORT, () => {
    logger.info(`GraphQL server listening on port ${SERVER_PORT}`)
    logger.info(
      `Health check available at http://localhost:${SERVER_PORT}${process.env.HEALTH_CHECK_PATH ?? '/health'}`,
    )
  })

  // Configure graceful shutdown
  gracefulShutdown(httpServer, {
    signals: 'SIGINT SIGTERM',
    timeout: 10000,
    onShutdown: async () => {
      logger.info('Shutting down Apollo Server')
      await server.stop()

      await redisService.disconnect()

      logger.info('Apollo Server stopped')
    },
    finally: () => {
      logger.info('Server gracefully shut down')
    },
  })

  return { httpServer, app }
}

export { startServer }
