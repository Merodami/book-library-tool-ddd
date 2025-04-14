import { apiTokenAuth } from '@book-library-tool/auth'
import { MongoDatabaseService } from '@book-library-tool/database'
import { RabbitMQEventBus } from '@book-library-tool/event-store'
import { errorMiddleware, logger } from '@book-library-tool/shared'
import { ProcessWalletPaymentHandler } from '@wallets/commands/ProcessWalletPaymentHandler.js'
import { WalletEventSubscriptions } from '@wallets/event-store/WalletEventSubscriptions.js'
import { WalletProjectionHandler } from '@wallets/event-store/WalletProjectionHandler.js'
import { WalletProjectionRepository } from '@wallets/persistence/mongo/WalletProjectionRepository.js'
import { WalletRepository } from '@wallets/persistence/mongo/WalletRepository.js'
import { WalletRouter } from '@wallets/routes/wallets/WalletRouter.js'
import cors from 'cors'
import express from 'express'
import gracefulShutdown from 'http-graceful-shutdown'

import { BookReturnHandler } from '../application/use_cases/commands/BookReturnHandler.js'

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
    process.env.WALLET_SERVICE_NAME || 'wallet_service',
  )

  await eventBus.init()

  // Instantiate the repository used for command (write) operations
  const walletRepository = new WalletRepository(dbService)

  // Instantiate the repository used for query (read) operations: your projections
  const walletProjectionRepository = new WalletProjectionRepository(dbService)

  // Set up event subscriptions to update read models (via the projection handler)
  const walletProjectionHandler = new WalletProjectionHandler(dbService)

  // Set up the payment handler for processing wallet payments
  const paymentHandler = new ProcessWalletPaymentHandler(
    walletRepository,
    walletProjectionRepository,
    eventBus,
  )

  const bookReturnHandler = new BookReturnHandler(walletRepository, eventBus)

  await WalletEventSubscriptions(
    eventBus,
    walletProjectionHandler,
    paymentHandler,
    bookReturnHandler,
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
   * Set up wallet routes:
   *
   * The createWalletRouter function accepts:
   *  - The wallet repository (for commands)
   *  - The projection repository (for queries)
   *  - The EventBus (for publishing events)
   */
  app.use('/wallets', (req, res, next) => {
    return WalletRouter(walletRepository, walletProjectionRepository, eventBus)(
      req,
      res,
      next,
    )
  })

  // Global error-handling middleware.
  app.use(errorMiddleware)

  // Start the HTTP server on the specified port.
  const SERVER_PORT = process.env.WALLETS_SERVICE_PORT || 3003
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`Wallets API listening on port ${SERVER_PORT}`)
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
