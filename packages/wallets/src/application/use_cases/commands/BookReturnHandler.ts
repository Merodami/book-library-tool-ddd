import { EventBus, WALLET_NOT_FOUND } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { ApplicationError } from '@book-library-tool/shared/src/errors.js'
import { BookReturnCommand } from '@commands/BookReturnCommand.js'
import { IWalletRepository } from '@repositories/IWalletRepository.js'

/**
 * Command handler for applying late fees to a wallet
 */
export class BookReturnHandler {
  constructor(
    private readonly walletRepository: IWalletRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Applies a late fee to a wallet
   */
  async execute(
    command: BookReturnCommand,
  ): Promise<{ bookPurchased: boolean }> {
    try {
      logger.info(
        `Processing book return for user ${command.userId} with days late: ${command.daysLate}`,
      )

      const existingWallet = await this.walletRepository.findByUserId(
        command.userId,
      )

      if (!existingWallet) {
        logger.warn(
          `No existing wallet found for user ${command.userId}. Cannot apply late fee.`,
        )

        throw new ApplicationError(
          404,
          WALLET_NOT_FOUND,
          `Wallet not found for user ${command.userId}`,
        )
      }

      // Get fee per day from environment or use default
      const feePerDay = Number(process.env.LATE_FEE_PER_DAY) || 0.2
      logger.debug(`Using late fee per day: ${feePerDay}€`)

      // Apply late fee to existing wallet
      const result = existingWallet.applyLateFee(
        command.daysLate,
        command.retailPrice,
        feePerDay,
      )

      const wallet = result.wallet
      const event = result.event
      const bookPurchased = result.bookPurchased

      // Debug information for troubleshooting
      logger.debug(
        `Wallet ID: ${wallet.id}, Current version: ${existingWallet.version}`,
      )
      logger.debug(`Event version: ${event.version}`)

      // Save event using the current version from the original wallet
      // NOT the newly created wallet instance's version
      await this.walletRepository.saveEvents(
        wallet.id,
        [event],
        existingWallet.version,
      )

      // Publish the event
      await this.eventBus.publish(event)

      logger.info(
        `Late fee applied to wallet for user ${command.userId}. Book purchased: ${bookPurchased}`,
      )

      return { bookPurchased }
    } catch (error) {
      if (error.code === 'CONCURRENCY_CONFLICT') {
        logger.warn(`Concurrency conflict detected for user ${command.userId}`)
        throw error
      }

      logger.error(`Failed to apply late fee: ${error.message}`)
      logger.error(error.stack)

      throw error
    }
  }
}
