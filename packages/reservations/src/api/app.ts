import express from 'express'
import { apiTokenAuth } from '@book-library-tool/auth'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import cors from 'cors'
import gracefulShutdown from 'http-graceful-shutdown'
import createRouter from './routes/index.js'
import { MongoDatabaseService } from '@book-library-tool/database'
import { ReservationRepository } from '@persistence/mongo/ReservationRepository.js'
import { ReservationService } from '@use_cases/ReservationService.js'
import { ReservationController } from '@controllers/reservationController.js'

async function startServer() {
  // Create a new instance of the MongoDatabaseService
  const DatabaseService = new MongoDatabaseService()

  try {
    await DatabaseService.connect()
    logger.info('Successfully connected to MongoDB.')
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`)

    process.exit(1)
  }

  // Create a new instances
  const reservationRepository = new ReservationRepository(DatabaseService)
  const reservationService = new ReservationService(reservationRepository)
  const reservationController = new ReservationController(reservationService)

  const app = express()
    .disable('x-powered-by')
    .use(
      cors({
        exposedHeaders: ['Date', 'Content-Disposition'],
      }),
    )
    .use(express.json())
    .use(apiTokenAuth({ secret: process.env.JWT_SECRET || 'default-secret' }))
    .use(createRouter(reservationController)) // Injecting the controller into the routes.
    .use(errorMiddleware)

  const SERVER_PORT = process.env.BOOKS_SERVICE_SERVER_PORT || 3001
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`App listening on port ${SERVER_PORT}`)
  })

  gracefulShutdown(server, {
    signals: 'SIGINT SIGTERM',
    timeout: 10000,
    onShutdown: async () => {
      logger.info('Closing DB connection...')

      await DatabaseService.disconnect()

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
