import { UpdateWalletBalanceHandler } from '@wallets/commands/UpdateWalletBalanceHandler.js'
import { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Controller responsible for updating wallet balances.
 */
export class UpdateWalletBalanceController {
  constructor(
    private readonly updateWalletBalanceHandler: UpdateWalletBalanceHandler,
  ) {}

  /**
   * POST /wallets/:userId/balance
   * Updates a wallet's balance with the specified amount
   */
  async updateWalletBalance(
    request: FastifyRequest<{
      Params: { id: string }
      Body: { amount: number }
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params
    const { amount } = request.body

    // Execute the command
    const wallet = await this.updateWalletBalanceHandler.execute({
      id,
      amount,
    })

    if (!wallet) {
      await reply.status(404).send({ message: 'Wallet not found after update' })

      return
    }

    await reply.status(200).send(wallet)
  }
}
