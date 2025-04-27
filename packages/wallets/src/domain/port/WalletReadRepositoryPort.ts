import type { DomainEvent } from '@book-library-tool/shared'
import { Wallet } from '@wallets/domain/entities/Wallet.js'

/**
 * Repository interface for wallet read operations
 */
export interface WalletReadRepositoryPort {
  /**
   * Retrieves all the domain events for a specific aggregate, ordered by version.
   *
   * @param aggregateId - The unique identifier of the Wallet aggregate.
   * @returns A promise that resolves to an array of DomainEvent objects.
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>

  /**
   * Finds a wallet by ID - necessary to support command operations
   *
   * @param id - The ID of the wallet to find
   * @returns The wallet if found, or null if not found
   */
  findById(id: string): Promise<Wallet | null>
}
