import { BaseReadProjectionRepository } from '@book-library-tool/database'
import {
  type DomainEvent,
  WALLET_CREATED,
  WALLET_DELETED,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { Wallet } from '@wallets/entities/Wallet.js'
import { IWalletReadRepository } from '@wallets/repositories/IWalletReadRepository.js'
import { Collection } from 'mongodb'

import { DomainWallet } from '../../../domain/entities/DomainWallet.js'
import { WalletDocument } from './documents/WalletDocument.js'
import { mapToDomain } from './mappers/WalletDocCodec.js'

/**
 * Repository implementation for wallet write operations following CQRS principles
 */
export class WalletReadRepository
  extends BaseReadProjectionRepository<WalletDocument, DomainWallet>
  implements IWalletReadRepository
{
  /**
   * Constructs a new WalletRepository
   * @param collection - MongoDB collection
   */
  constructor(collection: Collection<DomainEvent>) {
    super(collection, mapToDomain)
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
}
