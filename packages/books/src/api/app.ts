import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { createFastifyServer, startServer } from '@book-library-tool/http'
import { setCacheService } from '@book-library-tool/redis'
import { RedisService } from '@book-library-tool/redis/src/infrastructure/services/redis.js'
import type { DomainEvent } from '@book-library-tool/shared'
import { logger } from '@book-library-tool/shared'
import { createCatalogReadRouter } from '@books/api/routes/catalog/CatalogReadRouter.js'
import {
  BookDocument,
  BookReadEventSubscriptions,
  BookReadProjectionHandler,
  BookReadProjectionRepository,
  BookWriteEventSubscriptions,
  BookWriteProjectionHandler,
  BookWriteProjectionRepository,
  BookWriteRepository,
} from '@books/infrastructure/index.js'

import { createBookReadRouter } from './routes/books/BookReadRouter.js'
import { createBookWriteRouter } from './routes/books/BookWriteRouter.js'
async function startBookService() {
  // Create and connect the database service (write and projection share the same DB context)
  const dbService = new MongoDatabaseService(
    process.env.MONGO_DB_NAME_EVENT || 'events',
  )

  // Initialize Redis service
  const redisService = new RedisService({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
  })

  try {
    await dbService.connect()

    logger.info('Successfully connected to MongoDB.')
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`)

    process.exit(1)
  }

  try {
    await redisService.connect()

    setCacheService(redisService)

    logger.info('Successfully connected to MongoDB and Redis.')
  } catch (error) {
    logger.error(`Error during initialization: ${error}`)

    process.exit(1)
  }

  // Shared Infrastructure:
  // Create an instance of the EventBus (e.g., RabbitMQ)
  const eventBus = new RabbitMQEventBus(
    process.env.BOOK_SERVICE_NAME || 'book_service',
  )

  try {
    await eventBus.init()
  } catch (error) {
    logger.error(`Error initializing event bus: ${error}`)

    await dbService.disconnect()
    await redisService.disconnect()

    process.exit(1)
  }

  // Instantiate the repository used for command (write) operations
  const bookWriteRepository = new BookWriteRepository(
    dbService.getCollection<DomainEvent>('event_store'),
    dbService,
  )

  const bookReadProjectionRepository = new BookReadProjectionRepository(
    dbService.getCollection<BookDocument>('book_projection'),
  )

  const bookProjectionCollection =
    dbService.getCollection<BookDocument>('book_projection')

  // Instantiate the repository used for query (read) operations: your projections
  const bookProjectionRepository = new BookReadProjectionRepository(
    bookProjectionCollection,
  )

  const bookWriteProjectionRepository = new BookWriteProjectionRepository(
    bookProjectionCollection,
  )

  // Set up event subscriptions to update read models (via the projection handler)
  const bookReadProjectionHandler = new BookReadProjectionHandler(
    bookProjectionRepository,
  )

  const bookWriteProjectionHandler = new BookWriteProjectionHandler(
    bookWriteProjectionRepository,
  )

  await BookReadEventSubscriptions(eventBus, bookReadProjectionHandler)
  await BookWriteEventSubscriptions(
    eventBus,
    redisService,
    bookWriteProjectionHandler,
  )

  await eventBus.startConsuming()

  logger.info('Event subscriptions registered successfully')

  // Create server with standard configuration
  const SERVER_PORT = parseInt(process.env.BOOKS_SERVER_PORT || '3001', 10)

  const app = await createFastifyServer({
    serviceName: process.env.BOOK_SERVICE_NAME || 'book_service',
    port: SERVER_PORT,
    cacheService: redisService,
    healthChecks: [
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
      {
        name: 'redis',
        check: async () => {
          const health = await redisService.checkHealth()

          return health.status === 'healthy' || health.status === 'degraded'
        },
        details: { type: 'Redis' },
      },
    ],
  })

  /**
   * Set up book write routes (commands):
   *
   * The createBookWriteRouter function accepts:
   *  - The write repository (for commands)
   *  - The projection repository (for validation during writes)
   *  - The EventBus (for publishing events)
   */
  app.register(
    async (instance) => {
      return instance.register(
        createBookWriteRouter(
          bookWriteRepository,
          bookReadProjectionRepository,
          eventBus,
        ),
      )
    },
    { prefix: '/books' },
  )

  /**
   * Set up book read routes (queries):
   *
   * The createBookReadRouter function only needs:
   *  - The projection repository (for queries)
   */
  app.register(
    async (instance) => {
      return instance.register(
        createBookReadRouter(bookReadProjectionRepository),
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
      return instance.register(
        createCatalogReadRouter(bookProjectionRepository),
      )
    },
    { prefix: '/catalog' },
  )

  // Start server with graceful shutdown handling
  await startServer(app, SERVER_PORT, {
    onShutdown: async () => {
      logger.info('Closing DB connection...')
      await dbService.disconnect()
      logger.info('DB connection closed.')

      logger.info('Closing EventBus connection...')
      await eventBus.shutdown()
      logger.info('EventBus connection closed.')

      logger.info('Closing Redis connection...')
      await redisService.disconnect()
      logger.info('Redis connection closed.')
    },
  })
}

startBookService()
