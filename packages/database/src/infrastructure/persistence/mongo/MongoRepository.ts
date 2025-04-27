import { AggregateRoot, DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { MongoRepositoryPort } from '@database/port/index.js'
import { Collection } from 'mongodb'

export abstract class MongoRepository<T extends AggregateRoot>
  implements MongoRepositoryPort<T>
{
  constructor(protected readonly collection: Collection<DomainEvent>) {}

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
   * Groups events by their aggregateId.
   *
   * @protected
   */
  protected groupEventsByAggregateId(
    events: DomainEvent[],
  ): Record<string, DomainEvent[]> {
    const grouped: Record<string, DomainEvent[]> = {}

    for (const event of events) {
      if (!grouped[event.aggregateId]) {
        grouped[event.aggregateId] = []
      }

      grouped[event.aggregateId].push(event)
    }

    // Sort each group by version for correct ordering.
    Object.values(grouped).forEach((group) =>
      group.sort((a, b) => a.version - b.version),
    )

    return grouped
  }

  /**
   * Rehydrates an aggregate from events.
   * Must be implemented by concrete repositories.
   *
   * @param events Array of domain events.
   * @protected
   */
  protected abstract rehydrateFromEvents(events: DomainEvent[]): T | null
}
