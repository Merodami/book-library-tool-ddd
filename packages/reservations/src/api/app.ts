import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { fastifyAuth } from '@book-library-tool/http'
import { setupServiceHealthCheck } from '@book-library-tool/http'
import { logger } from '@book-library-tool/shared'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import { BookBroughtHandler } from '@reservations/commands/BookBroughtHandler.js'
import { PaymentHandler } from '@reservations/commands/PaymentHandler.js'
import { ValidateReservationHandler } from '@reservations/commands/ValidateReservationHandler.js'
import { ReservationEventSubscriptions } from '@reservations/event-store/ReservationEventSubscriptions.js'
import { ReservationProjectionHandler } from '@reservations/event-store/ReservationProjectionHandler.js'
import { ReservationProjectionRepository } from '@reservations/persistence/mongo/ReservationProjectionRepository.js'
import { ReservationRepository } from '@reservations/persistence/mongo/ReservationRepository.js'
import { createReservationRouter } from '@reservations/routes/reservations/createReservationRouter.js'
import closeWithGrace from 'close-with-grace'
import Fastify from 'fastify'

async function startServer() {
  // Initialize the infrastructure service (database connection)
  const dbService = new MongoDatabaseService(
    process.env.MONGO_DB_NAME_EVENT || 'event',
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
    process.env.RESERVATION_SERVICE_NAME || 'reservation_service',
  )

  await eventBus.init()

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
    ],
    {
      serviceName:
        process.env.RESERVATION_SERVICE_NAME || 'reservation_service',
    },
  )

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

  // Global error handling
  app.setErrorHandler((error, request, reply) => {
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
    process.env.RESERVATIONS_SERVICE_PORT || '3002',
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
