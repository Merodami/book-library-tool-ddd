import express from 'express'
import cors from 'cors'
import gracefulShutdown from 'http-graceful-shutdown'
import { apiTokenAuth } from '@book-library-tool/auth'
import { errorMiddleware, logger } from '@book-library-tool/shared'

import { MongoDatabaseService } from '@book-library-tool/database'
import { ReservationRepository } from '@persistence/mongo/ReservationRepository.js'
import { SimpleEventBus } from '@book-library-tool/event-store'

import { ReservationService } from '@use_cases/ReservationService.js'

import { ReservationController } from '@controllers/reservationController.js'
import createRouter from './routes/index.js'

async function startServer() {
  // Initialize the infrastructure service (database connection)
  const databaseService = new MongoDatabaseService('books-dev')
  try {
    await databaseService.connect()
    logger.info('Successfully connected to MongoDB.')
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`)
    process.exit(1)
  }

  // Instantiate the ReservationRepository with the database service.
  const reservationRepository = new ReservationRepository(databaseService)

  // Create the Event Bus (helps publish domain events or integrate event sourcing).
  const eventBus = new SimpleEventBus()

  // Wire up the application service (use-case).
  const reservationService = new ReservationService(
    reservationRepository,
    eventBus,
  )

  // Create the API controller by injecting the application service.
  const reservationController = new ReservationController(reservationService)

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
    // Mount the routes that delegate to the reservation controller.
    .use(createRouter(reservationController))
    // Global error-handling middleware.
    .use(errorMiddleware)

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
      await databaseService.disconnect()
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
