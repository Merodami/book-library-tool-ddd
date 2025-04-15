import type { EventBus } from '@book-library-tool/event-store'
import type { IWalletProjectionRepository } from '@wallets/repositories/IWalletProjectionRepository.js'
import type { IWalletRepository } from '@wallets/repositories/IWalletRepository.js'
import { Router } from 'express'

import { createWalletCommandRouter } from './WalletCommandRouter.js'
import { createWalletQueryRouter } from './WalletQueryRouter.js'

/**
 * Creates and configures the main wallet router
 * This router combines command and query routers
 */
export function WalletRouter(
  walletRepository: IWalletRepository,
  walletProjectionRepository: IWalletProjectionRepository,
  eventBus: EventBus,
): Router {
  const router = Router()

  // Mount query router (read operations)
  router.use('/', createWalletQueryRouter(walletProjectionRepository))

  // Mount command router (write operations)
  router.use(
    '/',
    createWalletCommandRouter(
      walletRepository,
      walletProjectionRepository,
      eventBus,
    ),
  )

  return router
}
