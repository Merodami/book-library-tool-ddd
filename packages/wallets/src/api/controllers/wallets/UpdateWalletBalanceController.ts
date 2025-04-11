import { User } from '@book-library-tool/sdk'
import { UpdateWalletBalanceHandler } from '@commands/UpdateWalletBalanceHandler.js'
import { NextFunction, Request, Response } from 'express'

/**
 * Controller responsible for updating wallet balances.
 */
export class UpdateWalletBalanceController {
  constructor(
    private readonly updateWalletBalanceHandler: UpdateWalletBalanceHandler,
  ) {
    this.updateWalletBalance = this.updateWalletBalance.bind(this)
  }

  /**
   * POST /wallets/:userId/balance
   * Updates a wallet's balance with the specified amount
   */
  async updateWalletBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params as Pick<User, 'userId'>
      const { amount } = req.body as { amount: number }

      // Execute the command
      const wallet = await this.updateWalletBalanceHandler.execute({
        userId,
        amount,
      })

      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found after update' })
        return
      }

      res.status(200).json(wallet)
    } catch (error) {
      next(error)
    }
  }
}
