import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ExpressContextFunctionArgument } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { RedisService } from '@book-library-tool/redis'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { ApiGateway } from '@library/api-gateway'
import cors from 'cors'
import express, { RequestHandler } from 'express'
import http from 'http'
import gracefulShutdown from 'http-graceful-shutdown'

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

interface ServerResult {
  httpServer: http.Server
  app: express.Express
}

async function startServer(): Promise<ServerResult> {
  logger.info('Starting GraphQL server')

  // Load configuration
  const config = loadConfig()

  // Initialize API Gateway
  const apiGateway = new ApiGateway()
  const app = apiGateway.app

  // Initialize Redis Service
  logger.info('Initializing Redis service...')
  const redisService = new RedisService()

  try {
    logger.info('Connecting to Redis...')
    await redisService.connect()
    logger.info('Redis connection established successfully')

    // Register Redis health check
    apiGateway.registerHealthCheck('redis', async () => {
      const health = await redisService.checkHealth()
      return health.status === 'healthy' || health.status === 'degraded'
    })
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    throw error
  }

  // Create service clients
  const booksService = new BooksService()
  const reservationsService = new ReservationsService()
  const bookLoader = new BookLoader()

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

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ...(plugins as any[]), // Type assertion needed due to mixed plugin types
    ],
  })

  // Start Apollo Server
  await server.start()

  // Apply rate limiting to GraphQL endpoint
  apiGateway.applyRateLimiting('/graphql', {
    errors: [
      {
        message: 'Rate limit exceeded',
        extensions: {
          code: 'RATE_LIMIT_EXCEEDED',
        },
      },
    ],
  })

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
  const SERVER_PORT = process.env.GRAPHQL_SERVER_PORT || 4000

  httpServer.listen(SERVER_PORT, () => {
    logger.info(`GraphQL server listening on port ${SERVER_PORT}`)
  })

  // Configure graceful shutdown
  gracefulShutdown(httpServer, {
    signals: 'SIGINT SIGTERM',
    timeout: 10000,
    onShutdown: async () => {
      logger.info('Shutting down Apollo Server')
      await server.stop()
      await redisService.disconnect()
      apiGateway.stop()
      logger.info('Apollo Server stopped')
    },
    finally: () => {
      logger.info('Server gracefully shut down')
    },
  })

  return { httpServer, app }
}

export { startServer }
