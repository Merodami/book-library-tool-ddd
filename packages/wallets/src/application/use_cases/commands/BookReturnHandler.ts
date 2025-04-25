import { IEventBus } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import {
  ErrorCode,
  getDefaultMessageForError,
} from '@book-library-tool/shared/src/errorCodes.js'
import { ApplicationError } from '@book-library-tool/shared/src/errors.js'
import { BookReturnCommand } from '@wallets/commands/BookReturnCommand.js'
import { IWalletReadProjectionRepository } from '@wallets/repositories/IWalletReadProjectionRepository.js'
import { IWalletReadRepository } from '@wallets/repositories/IWalletReadRepository.js'
import { IWalletWriteRepository } from '@wallets/repositories/IWalletWriteRepository.js'

/**
 * Command handler for applying late fees to a wallet.
 * This class handles the late fee processing workflow when books are returned,
 * including the business rule that a book is considered purchased if the late fee
 * exceeds its retail price.
 */
export class BookReturnHandler {
  constructor(
    private readonly walletWriteRepository: IWalletWriteRepository,
    private readonly walletReadRepository: IWalletReadRepository,
    private readonly walletReadProjectionRepository: IWalletReadProjectionRepository,
    private readonly eventBus: IEventBus,
  ) {}

  /**
   * Applies a late fee to a wallet based on the number of days a book is late.
   * This method implements the late fee processing workflow:
   * 1. Verifies the wallet exists
   * 2. Calculates the late fee based on days late
   * 3. Applies the fee and checks if the book is purchased
   * 4. Saves and publishes the domain event
   *
   * @param command - The book return command containing late fee details
   * @returns Promise resolving to an object indicating if the book was purchased
   * @throws {ApplicationError} If:
   *   - Wallet is not found (404)
   *   - Concurrency conflict occurs
   *   - Other processing errors occur
   */
  async execute(
    command: BookReturnCommand,
  ): Promise<{ bookPurchased: boolean }> {
    const { userId, reservationId, daysLate, retailPrice } = command

    try {
      logger.info(
        `Processing book return for user ${userId} with days late: ${daysLate}`,
      )

      const existingWalletProjection =
        await this.walletReadProjectionRepository.getWallet({
          userId,
        })

      if (!existingWalletProjection || !existingWalletProjection.id) {
        logger.warn(
          `No existing wallet found for user ${userId}. Cannot apply late fee.`,
        )

        throw new ApplicationError(
          404,
          ErrorCode.WALLET_NOT_FOUND,
          getDefaultMessageForError(ErrorCode.WALLET_NOT_FOUND),
        )
      }

      const existingWallet = await this.walletReadRepository.findById(
        existingWalletProjection.id,
      )

      if (!existingWallet) {
        logger.warn(
          `No existing wallet events found for user ${userId}. Cannot apply late fee.`,
        )

        throw new ApplicationError(
          404,
          ErrorCode.WALLET_NOT_FOUND,
          getDefaultMessageForError(ErrorCode.WALLET_NOT_FOUND),
        )
      }

      // Get fee per day from environment or use default
      const feePerDay = parseInt(process.env.LATE_FEE_PER_DAY ?? '0.2', 10)

      logger.debug(`Using late fee per day: ${feePerDay}€`)

      // Apply late fee to existing wallet
      const result = existingWallet.applyLateFee(
        command.reservationId,
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
      await this.walletWriteRepository.saveEvents(
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
