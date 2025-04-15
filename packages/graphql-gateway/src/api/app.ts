import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ExpressContextFunctionArgument } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { RedisService } from '@book-library-tool/redis'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import cors from 'cors'
import express, { Express, RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import http from 'http'
import gracefulShutdown from 'http-graceful-shutdown'

import { loadConfig } from '../config/index.js'
import { HealthCheck } from '../health/index.js'
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
  app: Express
}

async function startServer(): Promise<ServerResult> {
  logger.info('Starting GraphQL server')

  // Load configuration
  const config = loadConfig()

  // Initialize Redis Service
  logger.info('Initializing Redis service...')
  const redisService = new RedisService({
    host: config.redis.host,
    port: config.redis.port,
    defaultTTL: config.redis.defaultTTL,
  })

  try {
    logger.info('Connecting to Redis...')
    await redisService.connect()
    logger.info('Redis connection established successfully')
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    throw error
  }

  // Initialize Express app and configure middleware
  const app = express()
    .disable('x-powered-by')
    .use(
      cors({
        exposedHeaders: ['Date', 'Content-Disposition'],
      }),
    )
    .use(express.json())

  // Initialize health check
  const healthCheck = new HealthCheck(config)
  healthCheck.register(app)

  // Apply rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      errors: [
        {
          message: 'Rate limit exceeded',
          extensions: {
            code: 'RATE_LIMIT_EXCEEDED',
          },
        },
      ],
    },
  })

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
    schema: makeExecutableSchema({ typeDefs, resolvers }),
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ...(plugins as any[]), // Type assertion needed due to mixed plugin types
    ],
  })

  // Start Apollo Server
  await server.start()

  // Apply GraphQL middleware with rate limiting
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    limiter,
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
      healthCheck.stop()
      logger.info('Apollo Server stopped')
    },
    finally: () => {
      logger.info('Server gracefully shut down')
    },
  })

  return { httpServer, app }
}

export { startServer }
