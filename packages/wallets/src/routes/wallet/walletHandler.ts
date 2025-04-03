import { Request, Response, NextFunction } from 'express'
import { DatabaseService } from '@book-library-tool/database'
import { UserId, Wallet } from '@book-library-tool/sdk'
import { BalanceWalletRequest } from '@book-library-tool/sdk'

export const walletHandler = {
  /**
   * GET /wallets/:userId
   * Retrieves the wallet for a given user.
   */
  async getWallet(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params as UserId

      const walletCollection = DatabaseService.getCollection<Wallet>('wallets')
      const wallet = await DatabaseService.findOne(walletCollection, {
        userId: userId.trim(),
      })

      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found.' })
        return
      }

      res.status(200).json(wallet)
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /wallets/:userId/balance
   * Adds funds to the user's wallet.
   * Body: { amount: number }
   */
  async updateWalletBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params as UserId
      const { amount } = req.body as BalanceWalletRequest

      const walletCollection = DatabaseService.getCollection<Wallet>('wallets')

      // Use $inc to update the balance by the given amount (can be positive or negative)
      await DatabaseService.updateDocument(
        walletCollection,
        { userId: userId.trim() },
        { $inc: { balance: Math.floor(amount * 10) / 10 } }, // Rounding to 1 decimal place
        { upsert: true },
      )

      const wallet = await DatabaseService.findOne(walletCollection, {
        userId: userId.trim(),
      })

      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found.' })
        return
      }

      res.status(200).json(wallet)
    } catch (error) {
      next(error)
    }
  },

  /**
   * PATCH /wallets/:userId/late-return
   * Applies a late fee to the user's wallet when a book is returned late.
   * Expects a JSON body:
   * {
   *   "daysLate": number,
   *   "retailPrice": number
   * }
   * The fee is calculated as daysLate * LATE_FEE_PER_DAY euros.
   * If the fee is greater than or equal to the retailPrice, the response indicates
   * that the book is considered bought.
   */
  async lateReturn(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params as UserId
      const { daysLate, retailPrice } = req.body

      const fee = Number(daysLate) * Number(process.env.LATE_FEE_PER_DAY)

      const walletCollection = DatabaseService.getCollection<Wallet>('wallets')

      // Deduct the late fee from the user's wallet balance. (This may result in a negative balance.)
      await DatabaseService.updateDocument(
        walletCollection,
        { userId: userId.trim() },
        { $inc: { balance: -fee } },
        { upsert: true },
      )

      const wallet = await DatabaseService.findOne<Wallet>(walletCollection, {
        userId: userId.trim(),
      })

      const message =
        fee >= Number(retailPrice)
          ? 'Late fees have reached or exceeded the retail price; the book is considered bought.'
          : 'Late fee applied.'

      res.status(200).json({ message, wallet })
    } catch (error) {
      next(error)
    }
  },
}
