import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { createFastifyServer, startServer } from '@book-library-tool/http'
import { setCacheService } from '@book-library-tool/redis/src/application/decorators/cache.js'
import { RedisService } from '@book-library-tool/redis/src/infrastructure/services/redis.js'
import { logger } from '@book-library-tool/shared'
import { BookBroughtHandler } from '@reservations/commands/BookBroughtHandler.js'
import { PaymentHandler } from '@reservations/commands/PaymentHandler.js'
import { ValidateReservationHandler } from '@reservations/commands/ValidateReservationHandler.js'
import { ReservationEventSubscriptions } from '@reservations/event-store/ReservationEventSubscriptions.js'
import { ReservationProjectionHandler } from '@reservations/event-store/ReservationProjectionHandler.js'
import { ReservationProjectionRepository } from '@reservations/persistence/mongo/ReservationProjectionRepository.js'
import { ReservationRepository } from '@reservations/persistence/mongo/ReservationRepository.js'
import { createReservationRouter } from '@reservations/routes/reservations/createReservationRouter.js'

async function startReservationService() {
  // Initialize the infrastructure service (database connection)
  const dbService = new MongoDatabaseService(
    process.env.MONGO_DB_NAME_EVENT || 'event',
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
    process.env.RESERVATION_SERVICE_NAME || 'reservation_service',
  )

  try {
    await eventBus.init()
  } catch (error) {
    logger.error(`Error initializing event bus: ${error}`)
    await dbService.disconnect()
    process.exit(1)
  }

  // Instantiate the repository used for command (write) operations
  const reservationRepository = new ReservationRepository(dbService)

  // Instantiate the repository used for query (read) operations: your projections
  const reservationProjectionRepository = new ReservationProjectionRepository(
    dbService,
  )

  // Set up event subscriptions to update read models (via the projection handler)
  const reservationProjectionHandler = new ReservationProjectionHandler(
    reservationProjectionRepository,
  )

  const validateReservationHandler = new ValidateReservationHandler(
    reservationRepository,
    reservationProjectionRepository,
    reservationProjectionHandler,
    eventBus,
  )

  const paymentHandler = new PaymentHandler(
    reservationRepository,
    reservationProjectionHandler,
    eventBus,
  )

  const bookBrought = new BookBroughtHandler(reservationRepository, eventBus)

  // Subscribe to internal domain events for reservations
  await ReservationEventSubscriptions(
    eventBus,
    reservationProjectionHandler,
    validateReservationHandler,
    paymentHandler,
    bookBrought,
  )

  await eventBus.startConsuming()

  logger.info('Event subscriptions registered successfully')

  // Create server with standard configuration
  const SERVER_PORT = parseInt(
    process.env.RESERVATIONS_SERVER_PORT || '3002',
    10,
  )

  const app = await createFastifyServer({
    serviceName: process.env.RESERVATION_SERVICE_NAME || 'reservation_service',
    port: SERVER_PORT,
    cacheService: redisService,
    healthChecks: [
      {
        name: 'database',
        check: async () => {
          const health = await dbService.checkHealth()

          return health.status === 'UP'
        },
        details: {
          type: 'MongoDB',
          essential: true,
        },
      },
      {
        name: 'event-bus',
        check: async () => {
          const health = await eventBus.checkHealth()

          return health.status === 'UP'
        },
        details: {
          type: 'RabbitMQ',
          essential: true,
        },
      },
      {
        name: 'redis',
        check: async () => {
          const health = await redisService.checkHealth()

          return health.status === 'healthy' || health.status === 'degraded'
        },
        details: {
          type: 'Redis',
          essential: true,
        },
      },
    ],
  })

  /**
   * Set up reservation routes:
   *
   * The createReservationRouter function accepts:
   *  - The reservation repository (for commands)
   *  - The projection repository (for queries)
   *  - The EventBus (for publishing events)
   */
  app.register(
    async (instance) => {
      return instance.register(
        createReservationRouter(
          reservationRepository,
          reservationProjectionRepository,
          eventBus,
        ),
      )
    },
    { prefix: '/reservations' },
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

startReservationService()
