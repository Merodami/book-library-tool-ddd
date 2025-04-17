import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { fastifyAuth } from '@book-library-tool/http'
// Import the health check setup function from the file in the same folder
import { setupServiceHealthCheck } from '@book-library-tool/http'
import { logger } from '@book-library-tool/shared'
import { BookEventSubscriptions } from '@event-store/BookEventSubscriptions.js'
import { BookProjectionHandler } from '@event-store/BookProjectionHandler.js'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import { BookProjectionRepository } from '@persistence/mongo/BookProjectionRepository.js'
// Routers and controllers for different contexts
import { BookRepository } from '@persistence/mongo/BookRepository.js'
import { createBookRouter } from '@routes/books/BookRoute.js'
import { createCatalogRouter } from '@routes/catalog/CatalogRoute.js'
import closeWithGrace from 'close-with-grace'
import Fastify from 'fastify'

async function startServer() {
  // Create and connect the database service (write and projection share the same DB context)
  const dbService = new MongoDatabaseService(
    process.env.MONGO_DB_NAME_EVENT || 'events',
  )

  try {
    await dbService.connect()

    logger.info('Successfully connected to MongoDB.')
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`)

    process.exit(1)
  }

  // Shared Infrastructure:
  // Create an instance of the EventBus (e.g., RabbitMQ)
  const eventBus = new RabbitMQEventBus(
    process.env.BOOK_SERVICE_NAME || 'book_service',
  )
  await eventBus.init()

  // Instantiate the repository used for command (write) operations
  const bookRepository = new BookRepository(dbService)

  // Instantiate the repository used for query (read) operations: your projections
  const bookProjectionRepository = new BookProjectionRepository(dbService)

  // Set up event subscriptions to update read models (via the projection handler)
  const bookProjectionHandler = new BookProjectionHandler(
    bookProjectionRepository,
  )

  await BookEventSubscriptions(eventBus, bookProjectionHandler)

  await eventBus.startConsuming()

  logger.info('Event subscriptions registered successfully')

  // Initialize the Fastify application with enterprise-grade configuration
  const app = Fastify({
    logger: true,
    trustProxy: true,
    disableRequestLogging: process.env.NODE_ENV === 'production',
  })

  // Register core plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  })

  await app.register(fastifyCors, {
    exposedHeaders: ['Date', 'Content-Disposition'],
  })

  await app.register(fastifyRateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    timeWindow: '1 minute',
  })

  // Register authentication plugin
  await app.register(fastifyAuth, {
    secret: process.env.JWT_SECRET || 'default-secret',
    excludePaths: ['/health', '/health/details'],
  })

  // Setup health check endpoints
  setupServiceHealthCheck(
    app,
    [
      {
        name: 'database',
        check: async () => {
          const health = await dbService.checkHealth()

          return health.status === 'UP'
        },
        details: { type: 'MongoDB' },
      },
      {
        name: 'event-bus',
        check: async () => {
          const health = await eventBus.checkHealth()

          return health.status === 'UP'
        },
        details: { type: 'RabbitMQ' },
      },
    ],
    {
      serviceName: process.env.BOOK_SERVICE_NAME || 'book_service',
    },
  )

  /**
   * Set up book routes:
   *
   * The createBookRouter function should accept:
   *  - The event store repository (for commands)
   *  - The projection repository (for queries)
   *  - The EventBus (for publishing events)
   *
   * Inside createBookRouter, a unified facade (e.g., BookFacade) is built,
   * and then a single controller (BookController) delegates to that facade.
   */
  app.register(
    async (instance) => {
      return instance.register(
        createBookRouter(bookRepository, bookProjectionRepository, eventBus),
      )
    },
    { prefix: '/books' },
  )

  /**
   * Set up catalog routes:
   *
   * Here, we instantiate the catalog-specific repository, service, and controller.
   */
  app.register(
    async (instance) => {
      return instance.register(createCatalogRouter(bookProjectionRepository))
    },
    { prefix: '/catalog' },
  )

  // Global error handling
  app.setErrorHandler((error, request, reply) => {
    // Use existing error middleware logic for consistency
    const statusCode = error.statusCode || 500
    const response = {
      error: error.name || 'InternalServerError',
      message: error.message,
      statusCode,
      ...(process.env.NODE_ENV !== 'production' && statusCode === 500
        ? { stack: error.stack }
        : {}),
    }

    logger.error(`Error: ${error.message}`, {
      path: request.url,
      method: request.method,
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    })

    reply.status(statusCode).send(response)
  })

  // Start the HTTP server.
  const SERVER_PORT = parseInt(
    process.env.BOOKS_SERVICE_SERVER_PORT || '3001',
    10,
  )

  try {
    await app.listen({ port: SERVER_PORT, host: '0.0.0.0' })
    logger.info(`App listening on port ${SERVER_PORT}`)
    logger.info(
      `Health check available at http://localhost:${SERVER_PORT}/health`,
    )
  } catch (err) {
    logger.error('Error starting server:', err)
    process.exit(1)
  }

  // Configure graceful shutdown to close connections gracefully.
  closeWithGrace(
    {
      delay: 10000,
    },
    async ({ signal, err }) => {
      if (err) {
        logger.error(`Error during shutdown: ${err.message}`)
      }

      logger.info(`Received ${signal}, shutting down gracefully`)

      // Close Fastify server first to stop accepting new connections
      await app.close()
      logger.info('Server closed')

      logger.info('Closing DB connection...')
      await dbService.disconnect()
      logger.info('DB connection closed.')

      logger.info('Closing EventBus connection...')
      await eventBus.shutdown()
      logger.info('EventBus connection closed.')

      logger.info('Server gracefully shut down.')
    },
  )

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Promise Rejection: ${reason}`)
  })
}

startServer()
