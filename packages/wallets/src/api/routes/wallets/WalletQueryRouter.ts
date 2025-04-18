import { schemas } from '@book-library-tool/api'
import { paginationHook } from '@book-library-tool/http'
import { GetWalletController } from '@wallets/controllers/wallets/GetWalletController.js'
import { GetWalletHandler } from '@wallets/queries/GetWalletHandler.js'
import type { IWalletProjectionRepository } from '@wallets/repositories/IWalletProjectionRepository.js'
import { FastifyInstance } from 'fastify'

/**
 * Creates and configures the wallet query router
 * This router handles read operations (queries)
 */
export function createWalletQueryRouter(
  walletProjectionRepository: IWalletProjectionRepository,
): (fastify: FastifyInstance) => Promise<void> {
  return async (fastify: FastifyInstance) => {
    // Create handlers
    const getWalletHandler = new GetWalletHandler(walletProjectionRepository)

    // Create controllers
    const getWalletController = new GetWalletController(getWalletHandler)

    // Define query routes
    fastify.get<{
      Params: Pick<schemas.UserDTO, 'userId'>
    }>(
      '/:userId',
      {
        onRequest: [paginationHook],
        schema: {
          params: schemas.UserIdParameterSchema,
        },
      },
      (request, reply) => getWalletController.getWallet(request, reply),
    )
  }
}
