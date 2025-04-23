import { DomainEvent } from '@book-library-tool/event-store'
import { AggregateRoot } from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { BaseEventSourcedRepository } from '@database/persistence/mongo/BaseEventSourcedRepository.js'
import { Collection } from 'mongodb'

export abstract class BaseReadEventSourcedRepository<
  T extends AggregateRoot,
> extends BaseEventSourcedRepository<T> {
  constructor(protected readonly collection: Collection<DomainEvent>) {
    super(collection)
  }

  /**
   * Retrieves all events for a given aggregate.
   *
   * @param aggregateId Aggregate identifier.
   * @returns Array of domain events, sorted by version.
   */
  async getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]> {
    if (!aggregateId) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.INVALID_AGGREGATE_ID,
        'Aggregate ID is required',
      )
    }

    try {
      return await this.collection
        .find({ aggregateId })
        .sort({ version: 1 })
        .toArray()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.EVENT_LOOKUP_FAILED,
        `Failed to retrieve events for aggregate ${aggregateId}: ${message}`,
      )
    }
  }

  /**
   * Retrieves and rehydrates an aggregate by its ID.
   *
   * @param aggregateId Aggregate identifier.
   * @returns The rehydrated aggregate or null if not found.
   */
  async getById(aggregateId: string): Promise<T | null> {
    const events = await this.getEventsForAggregate(aggregateId)

    if (events.length === 0) {
      return null
    }

    return this.rehydrateFromEvents(events)
  }
}
