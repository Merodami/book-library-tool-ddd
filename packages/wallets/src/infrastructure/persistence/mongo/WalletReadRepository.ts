import { BaseReadEventSourcedRepository } from '@book-library-tool/database'
import {
  type DomainEvent,
  WALLET_CREATED,
  WALLET_DELETED,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { Wallet } from '@wallets/entities/Wallet.js'
import { IWalletReadRepository } from '@wallets/repositories/IWalletReadRepository.js'

/**
 * Repository implementation for wallet write operations following CQRS principles
 */
export class WalletReadRepository
  extends BaseReadEventSourcedRepository<Wallet>
  implements IWalletReadRepository
{
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
   * Finds a wallet by ID - this is the only necessary read operation to support commands
   * @param id - The ID of the wallet to find
   * @returns The wallet if found, or null if not found
   */
  async findById(id: string): Promise<Wallet | null> {
    if (!id) {
      logger.error('Invalid id provided to findById')

      return null
    }

    try {
      // Find wallet creation events for this user
      const events = await this.collection
        .find({
          'payload.id': id,
          eventType: WALLET_CREATED,
        })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray()

      if (events.length === 0) {
        logger.debug(`No wallet found for id ${id}`)

        return null
      }

      // Get the most recently created wallet's ID
      const aggregateId = events[0].aggregateId

      // Get all events for this wallet
      const walletEvents = await this.getEventsForAggregate(aggregateId)

      // Check if wallet has been deleted
      const isDeleted = walletEvents.some((e) => e.eventType === WALLET_DELETED)

      if (isDeleted) {
        logger.debug(`Wallet for id ${id} exists but is deleted`)

        return null
      }

      // Rehydrate the wallet from events
      return this.rehydrateFromEvents(walletEvents)
    } catch (error) {
      logger.error(`Error finding wallet for id ${id}: ${error.message}`)

      return null
    }
  }
}
