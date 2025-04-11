import { WalletDTO } from '@book-library-tool/api/src/schemas/wallets.js'
import { EventBus } from '@book-library-tool/event-store'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { Wallet } from '@entities/Wallet.js'
import { IWalletProjectionRepository } from '@repositories/IWalletProjectionRepository.js'
import { IWalletRepository } from '@repositories/IWalletRepository.js'

/**
 * Command handler for updating wallet balance
 */
export class UpdateWalletBalanceHandler {
  constructor(
    private readonly walletRepository: IWalletRepository,
    private readonly walletProjectionRepository: IWalletProjectionRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Updates a wallet's balance or creates a new wallet
   */
  async execute(command: {
    userId: string
    amount: number
  }): Promise<WalletDTO> {
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
   * Updates an existing wallet
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
   * Creates a new wallet
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
