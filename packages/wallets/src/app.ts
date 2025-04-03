import express from 'express'
import { DatabaseService } from '@book-library-tool/database'
import { apiTokenAuth } from '@book-library-tool/auth'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import cors from 'cors'
import gracefulShutdown from 'http-graceful-shutdown'
import router from './routes/index.js'

async function startServer() {
  try {
    await DatabaseService.connect()
    logger.info('Successfully connected to MongoDB.')
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error}`)

    process.exit(1)
  }

  const app = express()
    .disable('x-powered-by')
    .use(
      cors({
        exposedHeaders: ['Date', 'Content-Disposition'],
      }),
    )
    .use(express.json())
    .use(apiTokenAuth({ secret: process.env.JWT_SECRET || 'default-secret' }))
    .use(router)
    .use(errorMiddleware)

  const SERVER_PORT = process.env.WALLET_SERVICE_SERVER_PORT || 3002
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
