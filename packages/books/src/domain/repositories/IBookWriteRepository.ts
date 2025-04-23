import type { DomainEvent } from '@book-library-tool/event-store'

/**
 * IBookWriteRepository abstracts the persistence and retrieval of domain events
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface IBookWriteRepository {
  /**
   * Save a list of domain events for a given aggregate using a single operation.
   * An optimistic concurrency check on the expected version ensures that no
   * conflicting updates occur.
   *
   * @param aggregateId - The unique identifier of the Book aggregate.
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
   * @param aggregateId - The unique identifier of the Book aggregate.
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
   * @param aggregateId - The unique identifier of the Book aggregate.
   * @returns A promise that resolves to an array of DomainEvent objects.
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>
}
