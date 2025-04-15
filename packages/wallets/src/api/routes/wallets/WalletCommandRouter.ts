import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { UpdateWalletBalanceHandler } from '@wallets/commands/UpdateWalletBalanceHandler.js'
import { UpdateWalletBalanceController } from '@wallets/controllers/wallets/UpdateWalletBalanceController.js'
import type { IWalletProjectionRepository } from '@wallets/repositories/IWalletProjectionRepository.js'
import type { IWalletRepository } from '@wallets/repositories/IWalletRepository.js'
import { Router } from 'express'

/**
 * Creates and configures the wallet command router
 * This router handles write operations (commands)
 */
export function createWalletCommandRouter(
  walletRepository: IWalletRepository,
  walletProjectionRepository: IWalletProjectionRepository,
  eventBus: EventBus,
): Router {
  const router = Router()

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
  router.post(
    '/:userId/balance',
    validateParams(schemas.UserIdSchema),
    validateBody(schemas.WalletBalanceRequestSchema),
    updateWalletBalanceController.updateWalletBalance,
  )

  return router
}
