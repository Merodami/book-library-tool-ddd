import { ApplyLateFeeHandler } from '@commands/ApplyLetFeeHandler.js'
import { GetWalletHandler } from '@queries/GetWalletHandler.js'
import { NextFunction, Request, Response } from 'express'

/**
 * Controller responsible for applying late fees to wallets.
 */
export class ApplyLateFeeController {
  constructor(
    private readonly applyLateFeeHandler: ApplyLateFeeHandler,
    private readonly getWalletHandler: GetWalletHandler,
  ) {
    this.applyLateFee = this.applyLateFee.bind(this)
  }

  /**
   * PATCH /wallets/:userId/late-return
   * Applies a late fee to a user's wallet
   */
  async applyLateFee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params
      const { daysLate, retailPrice } = req.body

      // Execute the command
      const result = await this.applyLateFeeHandler.execute({
        userId,
        daysLate: Number(daysLate),
        retailPrice: Number(retailPrice),
      })

      // Get the updated wallet
      const wallet = await this.getWalletHandler.execute({ userId })

      const message = result.bookPurchased
        ? 'Late fees have reached or exceeded the retail price; the book is considered bought.'
        : 'Late fee applied.'

      res.status(200).json({ message, wallet })
    } catch (error) {
      next(error)
    }
  }
}
