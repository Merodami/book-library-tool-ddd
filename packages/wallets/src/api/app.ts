import { MongoDatabaseService } from '@book-library-tool/database'
import { DomainEvent, RabbitMQEventBus } from '@book-library-tool/event-store'
import { createFastifyServer, startServer } from '@book-library-tool/http'
import { setCacheService } from '@book-library-tool/redis/src/application/decorators/cache.js'
import { RedisService } from '@book-library-tool/redis/src/infrastructure/services/redis.js'
import { logger } from '@book-library-tool/shared'
import { ProcessWalletPaymentHandler } from '@wallets/commands/ProcessWalletPaymentHandler.js'
import { WalletEventSubscriptions } from '@wallets/event-store/WalletEventSubscriptions.js'
import { WalletProjectionHandler } from '@wallets/event-store/WalletProjectionHandler.js'
import { WalletReadRepository } from '@wallets/persistence/mongo/WalletReadRepository.js'
import { WalletWriteRepository } from '@wallets/persistence/mongo/WalletWriteRepository.js'
import { createWalletRouter } from '@wallets/routes/wallets/WalletRouter.js'

import { BookReturnHandler } from '../application/use_cases/commands/BookReturnHandler.js'
import { WalletReadProjectionRepository } from '../infrastructure/persistence/mongo/WalletReadProjectionRepository.js'

async function startWalletService() {
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
    process.env.WALLET_SERVICE_NAME || 'wallet_service',
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
  const walletWriteRepository = new WalletWriteRepository(
    dbService.getCollection<DomainEvent>('wallet_events'),
    dbService,
  )
  const walletReadRepository = new WalletReadRepository(
    dbService.getCollection<DomainEvent>('wallet_events'),
  )

  // Instantiate the repository used for query (read) operations: your projections
  const walletReadProjectionRepository = new WalletReadProjectionRepository(
    dbService.getCollection('wallets'),
  )

  // Set up event subscriptions to update read models (via the projection handler)
  const walletProjectionHandler = new WalletProjectionHandler(
    dbService,
    walletReadProjectionRepository,
    eventBus,
  )

  // Set up the payment handler for processing wallet payments
  const paymentHandler = new ProcessWalletPaymentHandler(
    walletWriteRepository,
    walletReadRepository,
    walletReadProjectionRepository,
    eventBus,
  )

  const bookReturnHandler = new BookReturnHandler(
    walletWriteRepository,
    walletReadRepository,
    eventBus,
  )

  await WalletEventSubscriptions(
    eventBus,
    walletProjectionHandler,
    paymentHandler,
    bookReturnHandler,
  )

  await eventBus.startConsuming()

  logger.info('Event subscriptions registered successfully')

  // Create server with standard configuration
  const SERVER_PORT = parseInt(process.env.WALLETS_SERVICE_PORT || '3003', 10)

  const app = await createFastifyServer({
    serviceName: process.env.WALLET_SERVICE_NAME || 'wallet_service',
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
   * Set up wallet routes:
   *
   * The createWalletRouter function accepts:
   *  - The wallet repository (for commands)
   *  - The projection repository (for queries)
   *  - The EventBus (for publishing events)
   */
  app.register(
    async (instance) => {
      return instance.register(
        createWalletRouter(
          walletRepository,
          walletProjectionRepository,
          eventBus,
        ),
      )
    },
    { prefix: '/wallets' },
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

startWalletService()
