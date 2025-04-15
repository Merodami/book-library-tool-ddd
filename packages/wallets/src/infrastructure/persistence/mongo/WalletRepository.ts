import { MongoDatabaseService } from '@book-library-tool/database'
import {
  BaseEventSourcedRepository,
  type DomainEvent,
  WALLET_CREATED,
  WALLET_DELETED,
} from '@book-library-tool/event-store'
import { Errors, logger } from '@book-library-tool/shared'
import { Wallet } from '@wallets/entities/Wallet.js'
import { IWalletRepository } from '@wallets/repositories/IWalletRepository.js'

/**
 * Repository implementation for wallet write operations following CQRS principles
 */
export class WalletRepository
  extends BaseEventSourcedRepository<Wallet>
  implements IWalletRepository
{
  /**
   * Constructs a new WalletRepository
   * @param dbService - MongoDB database service
   */
  constructor(dbService: MongoDatabaseService) {
    super(dbService)
    logger.info('Initialized WalletRepository')
  }

  /**
   * Rehydrates a Wallet aggregate from domain events
   * @param events - The sequence of events to rehydrate from
   * @returns The rehydrated Wallet aggregate or null if rehydration fails
   */
  protected rehydrateFromEvents(events: DomainEvent[]): Wallet | null {
    try {
      return Wallet.rehydrate(events)
    } catch (error) {
      logger.error(`Failed to rehydrate wallet: ${error.message}`)
      return null
    }
  }

  /**
   * Finds a wallet by user ID - this is the only necessary read operation to support commands
   * @param userId - The ID of the user whose wallet to find
   * @returns The wallet if found, or null if not found
   */
  async findByUserId(userId: string): Promise<Wallet | null> {
    if (!userId) {
      logger.error('Invalid userId provided to findByUserId')
      return null
    }

    try {
      // Find wallet creation events for this user
      const events = await this.collection
        .find({
          'payload.userId': userId,
          eventType: WALLET_CREATED,
        })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray()

      if (events.length === 0) {
        logger.debug(`No wallet found for user ${userId}`)
        return null
      }

      // Get the most recently created wallet's ID
      const aggregateId = events[0].aggregateId

      // Get all events for this wallet
      const walletEvents = await this.getEventsForAggregate(aggregateId)

      // Check if wallet has been deleted
      const isDeleted = walletEvents.some((e) => e.eventType === WALLET_DELETED)

      if (isDeleted) {
        logger.debug(`Wallet for user ${userId} exists but is deleted`)
        return null
      }

      // Rehydrate the wallet from events
      return this.rehydrateFromEvents(walletEvents)
    } catch (error) {
      logger.error(`Error finding wallet for user ${userId}: ${error.message}`)
      return null
    }
  }

  /**
   * Updates a wallet in the event store
   * @param wallet - The wallet to update
   * @param events - The events to apply
   * @returns void
   */
  async updateWallet(wallet: Wallet, events: DomainEvent[]): Promise<void> {
    if (!wallet || !wallet.id) {
      throw new Errors.ApplicationError(
        400,
        'INVALID_WALLET',
        'Invalid wallet provided to updateWallet',
      )
    }

    if (!events || events.length === 0) {
      logger.debug(`No events to save for wallet ${wallet.id}`)
      return
    }

    try {
      // Save the events with the current version
      await this.saveEvents(wallet.id, events, wallet.version - events.length)

      logger.debug(
        `Successfully updated wallet ${wallet.id} with ${events.length} events`,
      )
    } catch (error) {
      if (error.message && error.message.includes('CONCURRENCY_CONFLICT')) {
        logger.warn(`Concurrency conflict detected for wallet ${wallet.id}`)
        throw new Errors.ApplicationError(
          409,
          'CONCURRENCY_CONFLICT',
          `Concurrent update detected for wallet ${wallet.id}`,
        )
      }

      logger.error(`Error updating wallet ${wallet.id}: ${error.message}`)
      throw error
    }
  }
}
