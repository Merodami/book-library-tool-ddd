import { Cache } from '@book-library-tool/redis'
import { GetWalletHandler } from '@wallets/application/use_cases/queries/GetWalletHandler.js'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Controller responsible for handling wallet retrieval operations.
 * This controller follows the CQRS pattern, specifically handling queries (read operations).
 * It uses Fastify's request/response types for type safety and better integration with Fastify.
 */
export class GetWalletController {
  /**
   * Creates a new instance of GetWalletController
   * @param getWalletHandler - The handler responsible for executing the wallet retrieval logic
   */
  constructor(private readonly getWalletHandler: GetWalletHandler) {}

  /**
   * Handles GET requests to retrieve a wallet by user ID
   * @param request - Fastify request object containing the user ID in params
   * @param reply - Fastify reply object for sending the response
   * @returns Promise<void> - The response is sent through the reply object
   *
   * @example
   * GET /wallets/123
   * Response: { id: "123", balance: 100, ... }
   */
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'wallet',
    condition: (result) => result !== null,
  })
  async getWallet(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params

    const wallet = await this.getWalletHandler.execute({ id })

    if (!wallet) {
      await reply.status(404).send({ message: 'Wallet not found' })

      return
    }

    await reply.status(200).send(wallet)
  }
}
