import { DomainEvent } from '@book-library-tool/event-store'
import { Wallet } from '@wallets/entities/Wallet.js'

/**
 * Repository interface for wallet write operations
 */
export interface IWalletWriteRepository {
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
   * Updates a wallet in the event store by applying new events
   *
   * @param wallet - The wallet to update
   * @param events - The events to apply to the wallet
   * @throws {ApplicationError} If there's a concurrency conflict or other error
   */
  updateWallet(wallet: Wallet, events: DomainEvent[]): Promise<void>
}
