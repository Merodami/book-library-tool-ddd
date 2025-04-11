import { EventBus } from '@book-library-tool/event-store'
import { Wallet } from '@entities/Wallet.js'
import { IWalletRepository } from '@repositories/IWalletRepository.js'

/**
 * Command handler for applying late fees to a wallet
 */
export class ApplyLateFeeHandler {
  constructor(
    private readonly walletRepository: IWalletRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Applies a late fee to a wallet
   */
  async execute(command: {
    userId: string
    daysLate: number
    retailPrice: number
  }): Promise<{ bookPurchased: boolean }> {
    // Find existing wallet or create a new one
    let wallet: Wallet
    let events: any[] = []
    let bookPurchased = false

    // Get fee per day from environment or use default
    const feePerDay = Number(process.env.LATE_FEE_PER_DAY) || 0.2

    const existingWallet = await this.walletRepository.findByUserId(
      command.userId,
    )

    if (!existingWallet) {
      // Create a new wallet with negative balance (the fee)
      const fee = +(command.daysLate * feePerDay).toFixed(1)

      const result = Wallet.create({
        userId: command.userId,
        initialBalance: -fee,
      })

      wallet = result.wallet
      events = [result.event]
      bookPurchased = fee >= command.retailPrice
    } else {
      // Apply late fee to existing wallet
      const result = existingWallet.applyLateFee(
        command.daysLate,
        command.retailPrice,
        feePerDay,
      )
      wallet = result.wallet
      events = [result.event]
      bookPurchased = result.bookPurchased
    }

    // Save and publish events
    await this.walletRepository.saveEvents(
      wallet.id,
      events,
      wallet.version - 1,
    )

    for (const event of events) {
      await this.eventBus.publish(event)
    }

    return { bookPurchased }
  }
}
