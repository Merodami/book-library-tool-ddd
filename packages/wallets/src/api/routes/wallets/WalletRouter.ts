import type { EventBus } from '@book-library-tool/event-store'
import type { IWalletProjectionRepository } from '@wallets/repositories/IWalletProjectionRepository.js'
import type { IWalletRepository } from '@wallets/repositories/IWalletRepository.js'
import { FastifyInstance } from 'fastify'

import { createWalletCommandRouter } from './WalletCommandRouter.js'
import { createWalletQueryRouter } from './WalletQueryRouter.js'

/**
 * Creates and configures the main wallet router
 * This router combines command and query routers
 */
export function createWalletRouter(
  walletRepository: IWalletRepository,
  walletProjectionRepository: IWalletProjectionRepository,
  eventBus: EventBus,
): (fastify: FastifyInstance) => Promise<void> {
  return async (fastify: FastifyInstance) => {
    // Register query router (read operations)
    await fastify.register(createWalletQueryRouter(walletProjectionRepository))

    // Register command router (write operations)
    await fastify.register(
      createWalletCommandRouter(
        walletRepository,
        walletProjectionRepository,
        eventBus,
      ),
    )
  }
}
