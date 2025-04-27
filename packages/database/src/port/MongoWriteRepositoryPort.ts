import { AggregateRoot, DomainEvent } from '@book-library-tool/shared'
import { MongoRepositoryPort } from '@database/port/index.js'

/**
 * Interface for write-capable event-sourced repositories
 * Provides methods for persisting domain events with optimistic concurrency control
 *
 * @template T The aggregate root type that this repository manages
 */
export interface MongoWriteRepositoryPort<T extends AggregateRoot>
  extends MongoRepositoryPort<T> {
  /**
   * Save events with optimistic concurrency control.
   * Enriches each event with a per-aggregate version and a global version.
   *
   * @param aggregateId Unique identifier for the aggregate
   * @param events Array of domain events to persist
   * @param expectedVersion Expected current version of the aggregate
   * @throws ApplicationError with code INVALID_AGGREGATE_ID if aggregateId is empty
   * @throws ApplicationError with code CONCURRENCY_CONFLICT if version mismatch detected
   * @throws ApplicationError with code DUPLICATE_EVENT if event already exists
   * @throws ApplicationError with code EVENT_SAVE_FAILED for other errors
   */
  saveEvents(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>

  /**
   * Append a batch of events with retry logic.
   * Handles concurrency conflicts by retrying with exponential backoff.
   *
   * @param aggregateId Aggregate identifier
   * @param events Array of events to append
   * @param expectedVersion Expected version for optimistic concurrency control
   * @throws Error after maximum retry attempts exceeded
   */
  appendBatch(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>

  /**
   * Retrieves all events for a given aggregate.
   *
   * @param aggregateId Aggregate identifier.
   * @returns Array of domain events, sorted by version.
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>
}
