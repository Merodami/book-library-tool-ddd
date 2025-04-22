import { DomainEvent } from '@book-library-tool/event-store'
import { Wallet } from '@wallets/entities/Wallet.js'

/**
 * Repository interface for wallet read operations
 */
export interface IWalletReadRepository {
  /**
   * Retrieves all the domain events for a specific aggregate, ordered by version.
   *
   * @param aggregateId - The unique identifier of the Wallet aggregate.
   * @returns A promise that resolves to an array of DomainEvent objects.
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>

  /**
   * Finds a wallet by user ID - necessary to support command operations
   *
   * @param userId - The ID of the user whose wallet to find
   * @returns The wallet if found, or null if not found
   */
  findByUserId(userId: string): Promise<Wallet | null>
}
