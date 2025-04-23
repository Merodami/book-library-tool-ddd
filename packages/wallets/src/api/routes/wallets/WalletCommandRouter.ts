import { schemas } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { UpdateWalletBalanceHandler } from '@wallets/commands/UpdateWalletBalanceHandler.js'
import { UpdateWalletBalanceController } from '@wallets/controllers/wallets/UpdateWalletBalanceController.js'
import { FastifyInstance } from 'fastify'

import { IWalletReadRepository } from '../../../domain/repositories/IWalletReadRepository.js'
import { IWalletWriteRepository } from '../../../domain/repositories/IWalletWriteRepository.js'

/**
 * Creates and configures the wallet command router
 * This router handles write operations (commands)
 */
export function createWalletCommandRouter(
  walletReadRepository: IWalletReadRepository,
  walletWriteRepository: IWalletWriteRepository,
  eventBus: EventBus,
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
