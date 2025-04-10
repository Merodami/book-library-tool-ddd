import { apiTokenAuth } from '@book-library-tool/auth'
import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import { BookProjectionHandler } from '@event-store/BookProjectionHandler.js'
import { setupEventSubscriptions } from '@event-store/setupEventSubscriptions.js'
import { BookProjectionRepository } from '@persistence/mongo/BookProjectionRepository.js'
// Routers and controllers for different contexts
import { BookRepository } from '@persistence/mongo/BookRepository.js'
import { createBookRouter } from '@routes/books/BookRoute.js'
import { createCatalogRouter } from '@routes/catalog/CatalogRoute.js'
import cors from 'cors'
import express from 'express'
import gracefulShutdown from 'http-graceful-shutdown'

async function startServer() {
  // Create and connect the database service (write and projection share the same DB context)
  const databaseService = new MongoDatabaseService(
    process.env.MONGO_DB_NAME_EVENT || 'events',
  )

  try {
    await databaseService.connect()
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
  const bookRepository = new BookRepository(databaseService)

  // Instantiate the repository used for query (read) operations: your projections
  const bookProjectionRepository = new BookProjectionRepository(databaseService)

  // Set up event subscriptions to update read models (via the projection handler)
  const bookProjectionHandler = new BookProjectionHandler(databaseService)

  await setupEventSubscriptions(eventBus, bookProjectionHandler)

  await eventBus.startConsuming()

  logger.info('Event subscriptions registered successfully')

  // Initialize the Express application with common middleware.
  const app = express()
    .disable('x-powered-by')
    .use(cors({ exposedHeaders: ['Date', 'Content-Disposition'] }))
    .use(express.json())
    .use(apiTokenAuth({ secret: process.env.JWT_SECRET || 'default-secret' }))

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
  app.use('/books', (req, res, next) => {
    return createBookRouter(bookRepository, bookProjectionRepository, eventBus)(
      req,
      res,
      next,
    )
  })

  /**
   * Set up catalog routes:
   *
   * Here, we instantiate the catalog-specific repository, service, and controller.
   */
  app.use('/catalog', (req, res, next) => {
    return createCatalogRouter(bookProjectionRepository)(req, res, next)
  })

  // Global error handling middleware
  app.use(errorMiddleware)

  // Start the HTTP server.
  const SERVER_PORT = process.env.BOOKS_SERVICE_SERVER_PORT || 3001
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`App listening on port ${SERVER_PORT}`)
  })

  // Configure graceful shutdown to close connections gracefully.
  gracefulShutdown(server, {
    signals: 'SIGINT SIGTERM',
    timeout: 10000,
    onShutdown: async () => {
      logger.info('Closing DB connection...')
      await databaseService.disconnect()
      logger.info('DB connection closed.')
    },
    finally: () => {
      logger.info('Server gracefully shut down.')
    },
  })

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Promise Rejection: ${reason}`)
  })
}

startServer()
