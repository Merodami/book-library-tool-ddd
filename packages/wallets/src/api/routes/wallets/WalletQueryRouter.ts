import { schemas, validateParams } from '@book-library-tool/api'
import { GetWalletController } from '@controllers/wallets/GetWalletController.js'
import { GetWalletHandler } from '@queries/GetWalletHandler.js'
import type { IWalletProjectionRepository } from '@repositories/IWalletProjectionRepository.js'
import { Router } from 'express'

/**
 * Creates and configures the wallet query router
 * This router handles read operations (queries)
 */
export function createWalletQueryRouter(
  walletProjectionRepository: IWalletProjectionRepository,
) {
  const router = Router()

  // Create handlers
  const getWalletHandler = new GetWalletHandler(walletProjectionRepository)

  // Create controllers
  const getWalletController = new GetWalletController(getWalletHandler)

  // Define query routes
  router.get(
    '/:userId',
    validateParams(schemas.UserIdSchema),
    getWalletController.getWallet,
  )

  return router
}
