import { schemas } from '@book-library-tool/api'
import { paginationHook } from '@book-library-tool/http'
import { GetWalletController } from '@wallets/api/controllers/wallets/GetWalletController.js'
import { GetWalletHandler } from '@wallets/application/use_cases/queries/GetWalletHandler.js'
import { WalletReadProjectionRepositoryPort } from '@wallets/domain/port/index.js'
import { FastifyInstance } from 'fastify'

/**
 * Creates and configures the wallet query router
 * This router handles read operations (queries)
 */
export function createWalletQueryRouter(
  walletReadProjectionRepository: WalletReadProjectionRepositoryPort,
): (fastify: FastifyInstance) => Promise<void> {
  return async (fastify: FastifyInstance) => {
    // Create handlers
    const getWalletHandler = new GetWalletHandler(
      walletReadProjectionRepository,
    )

    // Create controllers
    const getWalletController = new GetWalletController(getWalletHandler)

    // Define query routes
    fastify.get<{
      Params: { id: string }
    }>(
      '/:id',
      {
        onRequest: [paginationHook],
        schema: {
          params: schemas.IdParameterSchema,
        },
      },
      (request, reply) => getWalletController.getWallet(request, reply),
    )
  }
}
