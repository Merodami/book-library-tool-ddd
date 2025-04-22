import {
  getNextGlobalVersion,
  MongoDatabaseService,
} from '@book-library-tool/database'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { DomainEvent } from '@event-store/events/DomainEvent.js'
import { AggregateRoot } from '@event-store/model/AggregateRoot.js'
import { Collection } from 'mongodb'

import { BaseEventSourcedRepository } from './BaseEventSourcedRepository.js'

export abstract class BaseWriteEventSourcedRepository<
  T extends AggregateRoot,
> extends BaseEventSourcedRepository<T> {
  protected readonly MAX_RETRY_ATTEMPTS = 3

  constructor(
    protected readonly collection: Collection<DomainEvent>,
    protected readonly dbService: MongoDatabaseService,
  ) {
    super(collection)
  }

  /**
   * Save events with optimistic concurrency control.
   * Enriches each event with a per-aggregate version and a global version.
   *
   * @param aggregateId Unique identifier for the aggregate.
   * @param events Array of domain events to persist.
   * @param expectedVersion Expected current version of the aggregate.
   */
  async saveEvents(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    if (!aggregateId) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.INVALID_AGGREGATE_ID,
        'Aggregate ID is required',
      )
    }

    if (!events || events.length === 0) {
      return // Nothing to save.
    }

    try {
      // Retrieve the current version for the aggregate.
      const latestEvent = await this.collection
        .find({ aggregateId })
        .sort({ version: -1 })
        .limit(1)
        .toArray()

      const currentVersion = latestEvent.length > 0 ? latestEvent[0].version : 0

      if (currentVersion !== expectedVersion) {
        throw new Errors.ApplicationError(
          409,
          ErrorCode.CONCURRENCY_CONFLICT,
          `Concurrency conflict for aggregate ${aggregateId}: expected version ${expectedVersion} but found ${currentVersion}.`,
        )
      }

      // Reserve a block of global versions equal to the number of events.
      const globalVersionBlock = await getNextGlobalVersion(
        this.dbService.getDb(),
        events.length,
      )

      // Calculate the starting global version for this batch.
      const startGlobalVersion = globalVersionBlock - events.length + 1

      // Enrich each event with the local aggregate version and the global version.
      const enrichedEvents = events.map((event, index) => ({
        ...event,
        timestamp: event.timestamp || new Date(),
        version: expectedVersion + index + 1,
        globalVersion: startGlobalVersion + index,
        metadata: {
          ...(event.metadata || {}), // Preserve existing metadata if provided.
          stored: new Date(),
          correlationId: event.metadata?.correlationId || crypto.randomUUID(),
        },
      }))

      // Insert the new events using an ordered operation to preserve order.
      await this.collection.insertMany(enrichedEvents, { ordered: true })
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Errors.ApplicationError(
          409,
          ErrorCode.DUPLICATE_EVENT,
          `Duplicate event detected for aggregate ${aggregateId}`,
        )
      }

      if (error instanceof Errors.ApplicationError) {
        throw error
      }

      const message = error instanceof Error ? error.message : String(error)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.EVENT_SAVE_FAILED,
        `Failed to save events for aggregate ${aggregateId}: ${message}`,
      )
    }
  }

  /**
   * Append a batch of events with retry logic.
   *
   * @param aggregateId Aggregate identifier.
   * @param events Array of events to append.
   * @param expectedVersion Expected version for optimistic concurrency control.
   */
  async appendBatch(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    let attempts = 0
    let lastError: Error | null = null

    while (attempts < this.MAX_RETRY_ATTEMPTS) {
      try {
        await this.saveEvents(aggregateId, events, expectedVersion)

        return // Success.
      } catch (error) {
        lastError = error
        // Only retry on concurrency conflicts.
        if (
          error instanceof Errors.ApplicationError &&
          error.message.includes(ErrorCode.CONCURRENCY_CONFLICT)
        ) {
          attempts++

          // Exponential backoff with jitter.
          const delay = Math.floor(Math.random() * (100 * 2 ** attempts)) + 50

          await new Promise((resolve) => setTimeout(resolve, delay))

          // Refresh expected version before retrying.
          const latestEvent = await this.collection
            .find({ aggregateId })
            .sort({ version: -1 })
            .limit(1)
            .toArray()

          expectedVersion = latestEvent.length > 0 ? latestEvent[0].version : 0
          continue
        }
        // Do not retry other errors.
        throw error
      }
    }
    throw (
      lastError || new Error('Failed to append events after multiple attempts')
    )
  }
}
