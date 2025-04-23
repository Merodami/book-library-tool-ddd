import type { EventBus } from '@book-library-tool/event-store'
import { FastifyInstance } from 'fastify'

import { IWalletReadProjectionRepository } from '../../../domain/repositories/IWalletReadProjectionRepository.js'
import { IWalletReadRepository } from '../../../domain/repositories/IWalletReadRepository.js'
import { IWalletWriteRepository } from '../../../domain/repositories/IWalletWriteRepository.js'
import { createWalletCommandRouter } from './WalletCommandRouter.js'
import { createWalletQueryRouter } from './WalletQueryRouter.js'

/**
 * Creates and configures the main wallet router
 * This router combines command and query routers
 */
export function createWalletRouter(
  walletReadRepository: IWalletReadRepository,
  walletWriteRepository: IWalletWriteRepository,
  walletReadProjectionRepository: IWalletReadProjectionRepository,
  eventBus: EventBus,
): (fastify: FastifyInstance) => Promise<void> {
  return async (fastify: FastifyInstance) => {
    // Register query router (read operations)
    await fastify.register(
      createWalletQueryRouter(walletReadProjectionRepository),
    )

    // Register command router (write operations)
    await fastify.register(
      createWalletCommandRouter(
        walletReadRepository,
        walletWriteRepository,
        eventBus,
      ),
    )
  }
}
