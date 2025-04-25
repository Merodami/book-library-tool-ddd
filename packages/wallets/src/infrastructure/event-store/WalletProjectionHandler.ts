import { MongoDatabaseService } from '@book-library-tool/database'
import { DomainEvent, IEventBus } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'

import { IWalletReadProjectionRepository } from '../../domain/repositories/IWalletReadProjectionRepository.js'

const WALLET_PROJECTION_TABLE = 'wallet_projection'

/**
 * Projection handler for wallet events.
 * This class is responsible for maintaining the read model of wallets by processing
 * domain events and updating a denormalized MongoDB collection. It implements the
 * CQRS pattern's read model, providing efficient query capabilities for wallet data.
 *
 * The handler processes wallet-related events to maintain eventual consistency
 * between the write model (event store) and the read model (projection). It ensures
 * that the wallet projection accurately reflects the current state of wallets in
 * the system.
 */
export class WalletProjectionHandler {
  constructor(
    private readonly db: MongoDatabaseService,
    private readonly walletReadProjectionRepository: IWalletReadProjectionRepository,
    private readonly eventBus: IEventBus,
  ) {}

  /**
   * Handles the WalletCreated event by creating a new wallet projection.
   * This method sets up the initial wallet state including:
   * - User ID and wallet ID
   * - Initial balance
   * - Version tracking
   * - Creation and update timestamps
   *
   * @param event - The WalletCreated domain event containing wallet creation details
   */
  async handleWalletCreated(event: DomainEvent): Promise<void> {
    await this.db.getCollection(WALLET_PROJECTION_TABLE).insertOne({
      id: event.aggregateId,
      userId: event.payload.userId,
      balance: event.payload.balance,
      version: event.version,
      createdAt: new Date(event.timestamp),
      updatedAt: new Date(event.timestamp),
    })

    logger.info(`Created wallet projection for user ${event.payload.userId}`)
  }

  /**
   * Handles the WalletBalanceUpdated event by updating the wallet's balance.
   * This method implements version-aware updates to prevent race conditions
   * and ensure data consistency. It only applies updates if the event version
   * is newer than the current projection version.
   *
   * @param event - The WalletBalanceUpdated domain event containing the new balance
   */
  async handleWalletBalanceUpdated(event: DomainEvent): Promise<void> {
    await this.db.getCollection(WALLET_PROJECTION_TABLE).updateOne(
      {
        id: event.aggregateId,
        version: { $lt: event.version },
      },
      {
        $set: {
          balance: event.payload.newBalance,
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )

    logger.info(`Updated wallet balance for user ${event.payload.userId}`)
  }

  /**
   * Handles the WalletLateFeeApplied event by updating the wallet's balance
   * after a late fee has been applied. This method ensures that late fees
   * are properly reflected in the wallet projection while maintaining
   * version consistency.
   *
   * @param event - The WalletLateFeeApplied domain event containing the updated balance
   */
  async handleWalletLateFeeApplied(event: DomainEvent): Promise<void> {
    await this.db.getCollection(WALLET_PROJECTION_TABLE).updateOne(
      {
        id: event.aggregateId,
        version: { $lt: event.version },
      },
      {
        $set: {
          balance: Number(event.payload.newBalance),
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )

    logger.info(`Applied late fee to wallet for user ${event.payload.userId}`)
  }
}
