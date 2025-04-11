import { apiTokenAuth } from '@book-library-tool/auth'
import { MongoDatabaseService } from '@book-library-tool/database'
import {
  RabbitMQEventBus,
  WALLET_PAYMENT_DECLINED,
  WALLET_PAYMENT_SUCCESS,
} from '@book-library-tool/event-store'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import { ReservationProjectionHandler } from '@event-store/ReservationProjectionHandler.js'
import { SetupEventSubscriptions } from '@event-store/SetupEventSubscriptions.js'
import { ReservationProjectionRepository } from '@persistence/mongo/ReservationProjectionRepository.js'
import { ReservationRepository } from '@persistence/mongo/ReservationRepository.js'
import { createReservationRouter } from '@routes/reservations/createReservationRouter.js'
import { createReservationStatusRouter } from '@routes/reservations/createReservationStatusRouter.js'
import cors from 'cors'
import express from 'express'
import gracefulShutdown from 'http-graceful-shutdown'

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
    dbService,
  )
  // Subscribe to wallet events for payment processing
  await eventBus.bindEventTypes([
    WALLET_PAYMENT_SUCCESS,
    WALLET_PAYMENT_DECLINED,
  ])

  // Subscribe to internal domain events for reservations
  await SetupEventSubscriptions(
    eventBus,
    reservationProjectionHandler,
    reservationRepository,
    reservationProjectionRepository,
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
    .use(apiTokenAuth({ secret: process.env.JWT_SECRET || 'default-secret' }))

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

  /**
   * Set up reservation status routes:
   *
   * These routes primarily handle queries about reservation status
   */
  app.use('/reservation-status', (req, res, next) => {
    return createReservationStatusRouter(reservationProjectionRepository)(
      req,
      res,
      next,
    )
  })

  // Global error-handling middleware.
  app.use(errorMiddleware)

  // Start the HTTP server on the specified port.
  const SERVER_PORT = process.env.RESERVATIONS_SERVICE_PORT || 3002
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`Reservations API listening on port ${SERVER_PORT}`)
  })

  // Set up graceful shutdown behavior.
  gracefulShutdown(server, {
    signals: 'SIGINT SIGTERM',
    timeout: 10000,
    onShutdown: async () => {
      logger.info('Closing DB connection...')
      await dbService.disconnect()
      logger.info('DB connection closed.')
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
