import { IEventBus } from '@book-library-tool/event-store'
import { EventResponse } from '@book-library-tool/sdk'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { UpdateWalletBalanceCommand } from '@wallets/commands/UpdateWalletBalanceCommand.js'
import { Wallet } from '@wallets/entities/Wallet.js'
import { IWalletReadRepository } from '@wallets/repositories/IWalletReadRepository.js'
import { IWalletWriteRepository } from '@wallets/repositories/IWalletWriteRepository.js'

/**
 * Command handler for updating wallet balance.
 * This class implements the command side of the CQRS pattern, handling
 * wallet balance updates through event sourcing. It ensures data consistency
 * by:
 * - Managing both new and existing wallet updates
 * - Handling concurrency conflicts
 * - Maintaining consistency between event store and projection
 * - Publishing domain events for state changes
 *
 * The handler is responsible for:
 * - Processing balance update commands
 * - Creating new wallets when needed
 * - Managing event persistence and publication
 * - Handling data inconsistencies between event store and projection
 */
export class UpdateWalletBalanceHandler {
  constructor(
    private readonly walletReadRepository: IWalletReadRepository,
    private readonly walletWriteRepository: IWalletWriteRepository,
    private readonly eventBus: IEventBus,
  ) {}

  /**
   * Updates a wallet's balance or creates a new wallet.
   * This method implements the main command processing logic, handling:
   * - Existing wallet updates through event sourcing
   * - New wallet creation when needed
   * - Data consistency checks between event store and projection
   * - Error handling and logging
   *
   * @param command - The balance update command
   * @returns Promise resolving to the updated wallet DTO
   * @throws {ApplicationError} If:
   *   - A concurrency conflict occurs (409)
   *   - The operation fails (500)
   */
  async execute(
    command: UpdateWalletBalanceCommand,
  ): Promise<EventResponse & { walletId: string }> {
    try {
      logger.info(
        `Updating wallet balance for wallet ${command.id} with amount ${command.amount}`,
      )

      // No wallet in event store, check if there's one in the projection
      const events = await this.walletReadRepository.getEventsForAggregate(
        command.id,
      )

      if (events.length === 0) {
        throw new Errors.ApplicationError(
          404,
          ErrorCode.WALLET_NOT_FOUND,
          `Wallet not found for wallet ${command.id}`,
        )
      }

      const wallet = Wallet.rehydrate(events)

      const updateResult = wallet.updateBalance(command.amount)
      const updatedWallet = updateResult.wallet
      const newEvent = updateResult.event

      // Save the event using the current version
      await this.walletWriteRepository.saveEvents(
        updatedWallet.id,
        [newEvent],
        wallet.version,
      )

      // Publish the event
      await this.eventBus.publish(newEvent)

      return {
        success: true,
        version: updatedWallet.version,
        walletId: updatedWallet.id,
      }
    } catch (error) {
      if (error.code === ErrorCode.CONCURRENCY_CONFLICT) {
        logger.warn(`Concurrency conflict detected for wallet ${command.id}`)

        throw new Errors.ApplicationError(
          409,
          ErrorCode.CONCURRENCY_CONFLICT,
          `Concurrent update detected for wallet ${command.id}, please retry the operation`,
        )
      }

      logger.error(`Failed to update wallet balance: ${error.message}`)
      logger.error(error.stack)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        `Failed to update wallet balance: ${error.message}`,
      )
    }
  }
}
