import { AggregateRoot } from '@book-library-tool/shared'
import { MongoRepositoryPort } from '@database/port/index.js'

/**
 * Interface for read-only event-sourced repositories that provide aggregate retrieval capabilities.
 * Extends the base event-sourced repository interface with methods for reading aggregates.
 *
 * @template T The aggregate root type that this repository manages
 */
export interface MongoReadRepositoryPort<T extends AggregateRoot>
  extends MongoRepositoryPort<T> {
  /**
   * Retrieves and rehydrates an aggregate by its ID.
   *
   * @param aggregateId The unique identifier of the aggregate
   * @returns Promise resolving to the rehydrated aggregate or null if not found
   * @throws ApplicationError with code INVALID_AGGREGATE_ID if aggregateId is empty
   * @throws ApplicationError with code EVENT_LOOKUP_FAILED if database operations fail
   */
  getById(aggregateId: string): Promise<T | null>
}
