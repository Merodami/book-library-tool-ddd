import { GetWalletHandler } from '@queries/GetWalletHandler.js'
import { NextFunction, Request, Response } from 'express'

/**
 * Controller responsible for retrieving wallet information.
 */
export class GetWalletController {
  constructor(private readonly getWalletHandler: GetWalletHandler) {
    this.getWallet = this.getWallet.bind(this)
  }

  /**
   * GET /wallets/:userId
   * Retrieves wallet information for a specific user
   */
  async getWallet(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params

      const wallet = await this.getWalletHandler.execute({ userId })

      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found' })
        return
      }

      res.status(200).json(wallet)
    } catch (error) {
      next(error)
    }
  }
}
