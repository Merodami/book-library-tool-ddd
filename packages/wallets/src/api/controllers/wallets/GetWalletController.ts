import { GetWalletHandler } from '@wallets/queries/GetWalletHandler.js'
import { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Controller responsible for retrieving wallet information.
 */
export class GetWalletController {
  constructor(private readonly getWalletHandler: GetWalletHandler) {}

  /**
   * GET /wallets/:userId
   * Retrieves wallet information for a specific user
   */
  async getWallet(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { userId } = request.params

    const wallet = await this.getWalletHandler.execute({ userId })

    if (!wallet) {
      await reply.status(404).send({ message: 'Wallet not found' })
      return
    }

    await reply.status(200).send(wallet)
  }
}
