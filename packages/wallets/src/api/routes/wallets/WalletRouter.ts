import type { EventBusPort } from '@book-library-tool/event-store'
import {
  WalletReadProjectionRepositoryPort,
  WalletReadRepositoryPort,
  WalletWriteRepositoryPort,
} from '@wallets/domain/port/index.js'
import { FastifyInstance } from 'fastify'

import { createWalletCommandRouter } from './WalletCommandRouter.js'
import { createWalletQueryRouter } from './WalletQueryRouter.js'
/**
 * Creates and configures the main wallet router
 * This router combines command and query routers
 */
export function createWalletRouter(
  walletReadRepository: WalletReadRepositoryPort,
  walletWriteRepository: WalletWriteRepositoryPort,
  walletReadProjectionRepository: WalletReadProjectionRepositoryPort,
  eventBus: EventBusPort,
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
