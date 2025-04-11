import { DomainEvent } from '@book-library-tool/event-store'
import { Wallet } from '@entities/Wallet.js'

/**
 * Repository interface for wallet write operations
 */
export interface IWalletRepository {
  /**
   * Save a list of domain events for a given aggregate using a single operation.
   * An optimistic concurrency check on the expected version ensures that no
   * conflicting updates occur.
   *
   * @param aggregateId - The unique identifier of the Wallet aggregate.
   * @param events - The list of DomainEvent objects to be persisted.
   * @param expectedVersion - The version of the aggregate prior to appending these events.
   */
  saveEvents(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>

  /**
   * Append a batch of events atomically for the given aggregate.
   * This method enforces that the current version of the aggregate matches
   * the expected version before the events are appended.
   *
   * @param aggregateId - The unique identifier of the Wallet aggregate.
   * @param events - The batch of DomainEvent objects to be appended.
   * @param expectedVersion - The current version expected on the aggregate.
   */
  appendBatch(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>

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

  /**
   * Updates a wallet in the event store by applying new events
   *
   * @param wallet - The wallet to update
   * @param events - The events to apply to the wallet
   * @throws {ApplicationError} If there's a concurrency conflict or other error
   */
  updateWallet(wallet: Wallet, events: DomainEvent[]): Promise<void>
}
