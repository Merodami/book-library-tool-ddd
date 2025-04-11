import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { ApplyLateFeeHandler } from '@commands/ApplyLetFeeHandler.js'
import { UpdateWalletBalanceHandler } from '@commands/UpdateWalletBalanceHandler.js'
import { ApplyLateFeeController } from '@controllers/wallets/ApplyLateFeeController.js'
import { UpdateWalletBalanceController } from '@controllers/wallets/UpdateWalletBalanceController.js'
import { GetWalletHandler } from '@queries/GetWalletHandler.js'
import type { IWalletProjectionRepository } from '@repositories/IWalletProjectionRepository.js'
import type { IWalletRepository } from '@repositories/IWalletRepository.js'
import { Router } from 'express'

/**
 * Creates and configures the wallet command router
 * This router handles write operations (commands)
 */
export function createWalletCommandRouter(
  walletRepository: IWalletRepository,
  walletProjectionRepository: IWalletProjectionRepository,
  eventBus: EventBus,
) {
  const router = Router()

  // Create command handlers
  const updateWalletBalanceHandler = new UpdateWalletBalanceHandler(
    walletRepository,
    walletProjectionRepository,
    eventBus,
  )

  const applyLateFeeHandler = new ApplyLateFeeHandler(
    walletRepository,
    eventBus,
  )

  // Create query handler needed for responses
  const getWalletHandler = new GetWalletHandler(walletProjectionRepository)

  // Create controllers
  const updateWalletBalanceController = new UpdateWalletBalanceController(
    updateWalletBalanceHandler,
  )

  const applyLateFeeController = new ApplyLateFeeController(
    applyLateFeeHandler,
    getWalletHandler,
  )

  // Define command routes
  router.post(
    '/:userId/balance',
    validateParams(schemas.UserIdSchema),
    validateBody(schemas.WalletBalanceRequestSchema),
    updateWalletBalanceController.updateWalletBalance,
  )

  router.patch(
    '/:userId/late-return',
    validateParams(schemas.UserIdSchema),
    validateBody(schemas.LateReturnRequestSchema),
    applyLateFeeController.applyLateFee,
  )

  return router
}
