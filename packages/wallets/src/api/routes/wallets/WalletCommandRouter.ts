import { schemas } from '@book-library-tool/api'
import type { EventBusPort } from '@book-library-tool/event-store'
import { UpdateWalletBalanceController } from '@wallets/api/controllers/wallets/UpdateWalletBalanceController.js'
import { UpdateWalletBalanceHandler } from '@wallets/application/use_cases/commands/UpdateWalletBalanceHandler.js'
import {
  WalletReadRepositoryPort,
  WalletWriteRepositoryPort,
} from '@wallets/domain/port/index.js'
import { FastifyInstance } from 'fastify'

/**
 * Creates and configures the wallet command router
 * This router handles write operations (commands)
 */
export function createWalletCommandRouter(
  walletReadRepository: WalletReadRepositoryPort,
  walletWriteRepository: WalletWriteRepositoryPort,
  eventBus: EventBusPort,
): (fastify: FastifyInstance) => Promise<void> {
  return async (fastify: FastifyInstance) => {
    // Create command handlers
    const updateWalletBalanceHandler = new UpdateWalletBalanceHandler(
      walletReadRepository,
      walletWriteRepository,
      eventBus,
    )

    // Create controllers
    const updateWalletBalanceController = new UpdateWalletBalanceController(
      updateWalletBalanceHandler,
    )

    // Define command routes
    fastify.post(
      '/:userId/balance',
      {
        schema: {
          params: schemas.UserIdParameterSchema,
          body: schemas.WalletBalanceRequestSchema,
        },
      },
      updateWalletBalanceController.updateWalletBalance.bind(
        updateWalletBalanceController,
      ),
    )
  }
}
