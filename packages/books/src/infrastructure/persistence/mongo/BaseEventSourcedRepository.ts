import {
  getNextGlobalVersion,
  type MongoDatabaseService,
} from '@book-library-tool/database'
import type { AggregateRoot, DomainEvent } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { Collection } from 'mongodb'

export abstract class BaseEventSourcedRepository<T extends AggregateRoot> {
  protected readonly collection: Collection<DomainEvent>
  protected readonly COLLECTION_NAME = 'event_store'
  protected readonly MAX_RETRY_ATTEMPTS = 3

  constructor(protected readonly dbService: MongoDatabaseService) {
    // Get the event store collection from the database service.
    this.collection = this.dbService.getCollection<DomainEvent>(
      this.COLLECTION_NAME,
    )

    // Initialize necessary indexes for efficient querying and concurrency control.
    this.initializeIndexes().catch((err) =>
      console.error(
        `Failed to initialize indexes for ${this.constructor.name}:`,
        err,
      ),
    )
  }

  /**
   * Initialize required indexes for the event store.
   * - A compound index on { aggregateId, version } enforces optimistic concurrency.
   * - An index on { eventType, timestamp } helps with event queries.
   * - A global index on { globalVersion } enables ordering events globally.
   * @protected
   */
  protected async initializeIndexes(): Promise<void> {
    try {
      // Core index for optimistic concurrency.
      await this.collection.createIndex(
        { aggregateId: 1, version: 1 },
        { unique: true, background: true },
      )

      // Index for event type searches and ordering.
      await this.collection.createIndex(
        { eventType: 1, timestamp: 1 },
        { background: true },
      )

      // Global index for ordering events across aggregates.
      await this.collection.createIndex(
        { globalVersion: 1 },
        { background: true },
      )

      // Allow subclasses to add their own specific indexes.
      await this.createEntitySpecificIndexes()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(
        `Failed to create indexes on ${this.COLLECTION_NAME}:`,
        message,
      )
    }
  }

  /**
   * Create entity-specific indexes - to be implemented by subclasses.
   * @protected
   */
  protected async createEntitySpecificIndexes(): Promise<void> {
    // Default implementation does nothing.
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
        'INVALID_AGGREGATE_ID',
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
          'CONCURRENCY_CONFLICT',
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
          'DUPLICATE_EVENT',
          `Duplicate event detected for aggregate ${aggregateId}`,
        )
      }

      if (error instanceof Errors.ApplicationError) {
        throw error
      }

      const message = error instanceof Error ? error.message : String(error)

      throw new Errors.ApplicationError(
        500,
        'EVENT_SAVE_FAILED',
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
          error.message.includes('CONCURRENCY_CONFLICT')
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
        'INVALID_AGGREGATE_ID',
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
        'EVENT_RETRIEVAL_FAILED',
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

  /**
   * Rehydrates an aggregate from events.
   * Must be implemented by concrete repositories.
   *
   * @param events Array of domain events.
   * @protected
   */
  protected abstract rehydrateFromEvents(events: DomainEvent[]): T | null
}
