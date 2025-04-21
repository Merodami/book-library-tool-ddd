import { schemas } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { UpdateWalletBalanceHandler } from '@wallets/commands/UpdateWalletBalanceHandler.js'
import { UpdateWalletBalanceController } from '@wallets/controllers/wallets/UpdateWalletBalanceController.js'
import type { IWalletProjectionRepository } from '@wallets/repositories/IWalletProjectionRepository.js'
import type { IWalletRepository } from '@wallets/repositories/IWalletRepository.js'
import { FastifyInstance } from 'fastify'

/**
 * Creates and configures the wallet command router
 * This router handles write operations (commands)
 */
export function createWalletCommandRouter(
  walletRepository: IWalletRepository,
  walletProjectionRepository: IWalletProjectionRepository,
  eventBus: EventBus,
): (fastify: FastifyInstance) => Promise<void> {
  return async (fastify: FastifyInstance) => {
    // Create command handlers
    const updateWalletBalanceHandler = new UpdateWalletBalanceHandler(
      walletRepository,
      walletProjectionRepository,
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
