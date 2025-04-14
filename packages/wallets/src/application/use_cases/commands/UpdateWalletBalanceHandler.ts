import { WalletDTO } from '@book-library-tool/api'
import { EventBus } from '@book-library-tool/event-store'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { UpdateWalletBalanceCommand } from '@wallets/commands/UpdateWalletBalanceCommand.js'
import { Wallet } from '@wallets/entities/Wallet.js'
import { IWalletProjectionRepository } from '@wallets/repositories/IWalletProjectionRepository.js'
import { IWalletRepository } from '@wallets/repositories/IWalletRepository.js'

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
    private readonly walletRepository: IWalletRepository,
    private readonly walletProjectionRepository: IWalletProjectionRepository,
    private readonly eventBus: EventBus,
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
  async execute(command: UpdateWalletBalanceCommand): Promise<WalletDTO> {
    try {
      logger.info(
        `Updating wallet balance for user ${command.userId} with amount ${command.amount}`,
      )

      // First check if user has an existing wallet in the event store
      const existingWallet = await this.walletRepository.findByUserId(
        command.userId,
      )

      if (existingWallet) {
        // Update existing wallet from event store
        return await this.updateExistingWallet(existingWallet, command.amount)
      }

      // No wallet in event store, check if there's one in the projection
      const walletProjection =
        await this.walletProjectionRepository.getWalletByUserId(command.userId)

      if (walletProjection) {
        // Projection exists but no wallet in event store - this is a data inconsistency
        logger.warn(
          `Wallet projection exists for user ${command.userId} but not in event store. Creating new wallet.`,
        )
      }

      // Create a new wallet (either no wallet exists at all, or only in projection)
      return await this.createNewWallet(command.userId, command.amount)
    } catch (error) {
      if (error.code === ErrorCode.CONCURRENCY_CONFLICT) {
        logger.warn(`Concurrency conflict detected for user ${command.userId}`)

        throw new Errors.ApplicationError(
          409,
          ErrorCode.CONCURRENCY_CONFLICT,
          `Concurrent update detected for wallet of user ${command.userId}, please retry the operation`,
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

  /**
   * Updates an existing wallet through event sourcing.
   * This method handles the update of an existing wallet by:
   * - Generating a new balance update event
   * - Persisting the event with version control
   * - Publishing the event for projection updates
   *
   * @param wallet - The existing wallet to update
   * @param amount - The amount to update the balance by
   * @returns Promise resolving to the updated wallet DTO
   */
  private async updateExistingWallet(
    wallet: Wallet,
    amount: number,
  ): Promise<WalletDTO> {
    logger.info(`Updating existing wallet ${wallet.id} with amount ${amount}`)

    const updateResult = wallet.updateBalance(amount)
    const updatedWallet = updateResult.wallet
    const newEvent = updateResult.event

    // Save the event using the current version
    await this.walletRepository.saveEvents(
      updatedWallet.id,
      [newEvent],
      wallet.version,
    )

    // Publish the event
    await this.eventBus.publish(newEvent)

    return updatedWallet.toDTO()
  }

  /**
   * Creates a new wallet through event sourcing.
   * This method handles the creation of a new wallet by:
   * - Generating a wallet creation event
   * - Persisting the event
   * - Publishing the event for projection updates
   *
   * @param userId - The ID of the user to create the wallet for
   * @param initialBalance - The initial balance for the new wallet
   * @returns Promise resolving to the new wallet DTO
   */
  private async createNewWallet(
    userId: string,
    initialBalance: number,
  ): Promise<WalletDTO> {
    logger.info(
      `Creating new wallet for user ${userId} with initial balance ${initialBalance}`,
    )

    const result = Wallet.create({
      userId: userId,
      initialBalance: initialBalance,
    })

    const wallet = result.wallet
    const event = result.event

    // Save the event
    await this.walletRepository.saveEvents(wallet.id, [event], 0)

    // Publish event
    await this.eventBus.publish(event)

    return wallet.toDTO()
  }
}
