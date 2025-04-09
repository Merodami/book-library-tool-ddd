import express from 'express'
import { apiTokenAuth } from '@book-library-tool/auth'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import cors from 'cors'
import gracefulShutdown from 'http-graceful-shutdown'

import { MongoDatabaseService } from '@book-library-tool/database'
import { SimpleEventBus } from '@book-library-tool/event-store'

import { createBookRouter } from '@routes/bookRoute.js'
import { BookController } from '@controllers/bookController.js'
import { BookRepository } from '@persistence/mongo/BookRepository.js'
import { BookService } from '@use_cases/BookService.js'

import { createCatalogRouter } from '@routes/catalogRoute.js'
import { CatalogController } from '@controllers/catalogController.js'
import { CatalogService } from '@use_cases/CatalogService.js'
import { setupEventSubscriptions } from '@event-store/setupEventSubscriptions.js'
import { BookProjectionHandler } from '@event-store/BookProjectionHandler.js'
import { CatalogRepository } from '../infrastructure/persistence/mongo/CatalogRepository.js'

async function startServer() {
  const databaseService = new MongoDatabaseService('event')

  try {
    await databaseService.connect()
    logger.info('Successfully connected to MongoDB.')
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`)
    process.exit(1)
  }

  // Create shared resources
  const eventBus = new SimpleEventBus()
  const bookRepository = new BookRepository(databaseService)

  // Create handlers for event subscriptions
  const bookProjectionHandler = new BookProjectionHandler(databaseService)

  // Set up event subscriptions
  setupEventSubscriptions(eventBus, bookProjectionHandler)

  logger.info('Event subscriptions registered successfully')

  // Initialize the app with middleware shared across all routes
  const app = express()
    .disable('x-powered-by')
    .use(
      cors({
        exposedHeaders: ['Date', 'Content-Disposition'],
      }),
    )
    .use(express.json())
    .use(apiTokenAuth({ secret: process.env.JWT_SECRET || 'default-secret' }))

  // Set up book routes - only initialized when '/books' endpoint is accessed
  app.use('/books', (req, res, next) => {
    // Lazy initialization of book service and controller
    const bookService = new BookService(bookRepository, eventBus)
    const bookController = new BookController(bookService)

    // Pass request to book router
    return createBookRouter(bookController)(req, res, next)
  })

  // Set up catalog routes - only initialized when '/catalog' endpoint is accessed
  app.use('/catalog', (req, res, next) => {
    // Lazy initialization of catalog service and controller
    const catalogRepository = new CatalogRepository(databaseService)
    const catalogService = new CatalogService(catalogRepository)
    const catalogController = new CatalogController(catalogService)

    // Pass request to catalog router
    return createCatalogRouter(catalogController)(req, res, next)
  })

  // Add error handling after all routes
  app.use(errorMiddleware)

  const SERVER_PORT = process.env.BOOKS_SERVICE_SERVER_PORT || 3001
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`App listening on port ${SERVER_PORT}`)
  })

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
