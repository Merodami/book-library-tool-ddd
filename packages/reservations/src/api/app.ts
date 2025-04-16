import { apiTokenAuth } from '@book-library-tool/auth'
import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import { BookBroughtHandler } from '@reservations/commands/BookBroughtHandler.js'
import { PaymentHandler } from '@reservations/commands/PaymentHandler.js'
import { ValidateReservationHandler } from '@reservations/commands/ValidateReservationHandler.js'
import { ReservationEventSubscriptions } from '@reservations/event-store/ReservationEventSubscriptions.js'
import { ReservationProjectionHandler } from '@reservations/event-store/ReservationProjectionHandler.js'
import { ReservationProjectionRepository } from '@reservations/persistence/mongo/ReservationProjectionRepository.js'
import { ReservationRepository } from '@reservations/persistence/mongo/ReservationRepository.js'
import { createReservationRouter } from '@reservations/routes/reservations/createReservationRouter.js'
import cors from 'cors'
import express from 'express'
import gracefulShutdown from 'http-graceful-shutdown'

import { setupServiceHealthCheck } from './healthcheck.js'

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

  // Initialize Express app and configure middleware.
  const app = express()
    .disable('x-powered-by')
    .use(
      cors({
        exposedHeaders: ['Date', 'Content-Disposition'],
      }),
    )
    .use(express.json())
    // Apply token-based authentication.
    .use((req, res, next) => {
      // Skip authentication for health check endpoints
      if (req.path === '/health' || req.path.startsWith('/health/')) {
        return next()
      }
      // Apply token-based authentication for all other routes
      return apiTokenAuth({
        secret: process.env.JWT_SECRET || 'default-secret',
      })(req, res, next)
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
  app.use('/reservations', (req, res, next) => {
    return createReservationRouter(
      reservationRepository,
      reservationProjectionRepository,
      eventBus,
    )(req, res, next)
  })

  // Global error-handling middleware.
  app.use(errorMiddleware)

  // Start the HTTP server on the specified port.
  const SERVER_PORT = process.env.RESERVATIONS_SERVICE_PORT || 3002
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`Reservations API listening on port ${SERVER_PORT}`)
    logger.info(
      `Health check available at http://localhost:${SERVER_PORT}/health`,
    )
  })

  // Set up graceful shutdown behavior.
  gracefulShutdown(server, {
    signals: 'SIGINT SIGTERM',
    timeout: 10000,
    onShutdown: async () => {
      logger.info('Closing DB connection...')
      await dbService.disconnect()
      logger.info('DB connection closed.')

      logger.info('Closing EventBus connection...')

      await eventBus.shutdown()

      logger.info('EventBus connection closed.')
    },
    finally: () => {
      logger.info('Server gracefully shut down.')
    },
  })

  // Global unhandled rejection handler.
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Promise Rejection: ${reason}`)
  })
}

startServer()
