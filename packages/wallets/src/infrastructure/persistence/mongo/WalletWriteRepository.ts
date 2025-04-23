import {
  BaseWriteEventSourcedRepository,
  MongoDatabaseService,
} from '@book-library-tool/database'
import { DomainEvent } from '@book-library-tool/event-store'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { Wallet } from '@wallets/entities/Wallet.js'
import { IWalletWriteRepository } from '@wallets/repositories/IWalletWriteRepository.js'
import { Collection } from 'mongodb'

/**
 * Repository implementation for wallet write operations following CQRS principles
 */
export class WalletWriteRepository
  extends BaseWriteEventSourcedRepository<Wallet>
  implements IWalletWriteRepository
{
  /**
   * Constructs a new WalletRepository
   * @param collection - MongoDB collection
   */
  constructor(
    collection: Collection<DomainEvent>,
    dbService: MongoDatabaseService,
  ) {
    super(collection, dbService)
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
   * Updates a wallet in the event store
   * @param wallet - The wallet to update
   * @param events - The events to apply
   * @returns void
   */
  async updateWallet(wallet: Wallet, events: DomainEvent[]): Promise<void> {
    if (!wallet || !wallet.id) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.WALLET_NOT_FOUND,
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
          ErrorCode.CONCURRENCY_CONFLICT,
          `Concurrent update detected for wallet ${wallet.id}`,
        )
      }

      logger.error(`Error updating wallet ${wallet.id}: ${error.message}`)
      throw error
    }
  }
}
