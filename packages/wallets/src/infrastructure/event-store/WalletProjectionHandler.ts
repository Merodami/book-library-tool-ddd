import { MongoDatabaseService } from '@book-library-tool/database'
import { DomainEvent } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'

const WALLET_PROJECTION_TABLE = 'wallet_projection'

/**
 * Projection handler for wallet events
 */
export class WalletProjectionHandler {
  constructor(private readonly db: MongoDatabaseService) {}

  /**
   * Handles the WalletCreated event
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
   * Handles the WalletBalanceUpdated event
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
   * Handles the WalletLateFeeApplied event
   */
  async handleWalletLateFeeApplied(event: DomainEvent): Promise<void> {
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

    logger.info(`Applied late fee to wallet for user ${event.payload.userId}`)
  }
}
