import type { EventBus } from '@book-library-tool/event-store'
import type { IWalletProjectionRepository } from '@repositories/IWalletProjectionRepository.js'
import type { IWalletRepository } from '@repositories/IWalletRepository.js'
import { createWalletCommandRouter } from '@routes/wallets/WalletCommandRouter.js'
import { createWalletQueryRouter } from '@routes/wallets/WalletQueryRouter.js'
import { Router } from 'express'

/**
 * Creates and configures the main wallet router
 * This router combines command and query routers
 */
export function WalletRouter(
  walletRepository: IWalletRepository,
  walletProjectionRepository: IWalletProjectionRepository,
  eventBus: EventBus,
) {
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
