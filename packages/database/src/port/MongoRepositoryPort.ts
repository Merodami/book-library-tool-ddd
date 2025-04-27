import { AggregateRoot, DomainEvent } from '@book-library-tool/shared'

/**
 * Interface for event-sourced repositories that store and retrieve domain events for aggregates.
 *
 * @template T The aggregate root type that this repository manages
 */
export interface MongoRepositoryPort<T extends AggregateRoot> {
  /**
   * Retrieves all events for a given aggregate.
   *
   * @param aggregateId Aggregate identifier
   * @returns Promise resolving to an array of domain events, sorted by version
   * @throws ApplicationError with code INVALID_AGGREGATE_ID if aggregateId is empty
   * @throws ApplicationError with code EVENT_LOOKUP_FAILED if database operations fail
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>
}
