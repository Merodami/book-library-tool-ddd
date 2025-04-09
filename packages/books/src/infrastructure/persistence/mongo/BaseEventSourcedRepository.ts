import { Collection } from 'mongodb'
import type { MongoDatabaseService } from '@book-library-tool/database'
import type { DomainEvent, AggregateRoot } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'

export abstract class BaseEventSourcedRepository<T extends AggregateRoot> {
  protected readonly collection: Collection<DomainEvent>
  protected readonly COLLECTION_NAME = 'event_store'
  protected readonly MAX_RETRY_ATTEMPTS = 3

  constructor(protected readonly dbService: MongoDatabaseService) {
    this.collection = this.dbService.getCollection<DomainEvent>(
      this.COLLECTION_NAME,
    )

    this.initializeIndexes().catch((err) =>
      console.error(
        `Failed to initialize indexes for ${this.constructor.name}:`,
        err,
      ),
    )
  }

  /**
   * Initialize required indexes for the event store
   * @protected
   */
  protected async initializeIndexes(): Promise<void> {
    try {
      // Core index for optimistic concurrency
      await this.collection.createIndex(
        { aggregateId: 1, version: 1 },
        { unique: true, background: true },
      )

      // Index for event type searches
      await this.collection.createIndex(
        { eventType: 1, timestamp: 1 },
        { background: true },
      )

      // Allow subclasses to add their own specific indexes
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
   * Create entity-specific indexes - to be implemented by subclasses
   * @protected
   */
  protected async createEntitySpecificIndexes(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Save events with optimistic concurrency control
   * @param aggregateId Unique identifier for the aggregate
   * @param events Events to persist
   * @param expectedVersion Expected current version of the aggregate
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
      return // Nothing to save
    }

    try {
      // Get the current version for the aggregate
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

      // Add metadata to events before storing
      const enrichedEvents = events.map((event, index) => ({
        ...event,
        timestamp: event.timestamp || new Date(),
        version: expectedVersion + index + 1,
        metadata: {
          ...(event.metadata || {}), // Safely spread existing metadata or empty object
          stored: new Date(),
          correlationId: event.metadata?.correlationId || crypto.randomUUID(),
        },
      }))

      // Insert the new events using an ordered operation
      await this.collection.insertMany(enrichedEvents, { ordered: true })
    } catch (error) {
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new Errors.ApplicationError(
          409,
          'DUPLICATE_EVENT',
          `Duplicate event detected for aggregate ${aggregateId}`,
        )
      }

      // Re-throw ApplicationErrors
      if (error instanceof Errors.ApplicationError) {
        throw error
      }

      // Convert other errors
      const message = error instanceof Error ? error.message : String(error)
      throw new Errors.ApplicationError(
        500,
        'EVENT_SAVE_FAILED',
        `Failed to save events for aggregate ${aggregateId}: ${message}`,
      )
    }
  }

  /**
   * Append a batch of events with retry logic
   * @param aggregateId Aggregate identifier
   * @param events Events to append
   * @param expectedVersion Expected version for concurrency control
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
        return // Success
      } catch (error) {
        lastError = error

        // Only retry on concurrency conflicts
        if (
          error instanceof Errors.ApplicationError &&
          error.message === 'CONCURRENCY_CONFLICT'
        ) {
          attempts++

          // Exponential backoff with jitter
          const delay = Math.floor(Math.random() * (100 * 2 ** attempts)) + 50
          await new Promise((resolve) => setTimeout(resolve, delay))

          // Refresh the expected version before retrying
          const latestEvent = await this.collection
            .find({ aggregateId })
            .sort({ version: -1 })
            .limit(1)
            .toArray()

          expectedVersion = latestEvent.length > 0 ? latestEvent[0].version : 0
          continue
        }

        // Don't retry other errors
        throw error
      }
    }

    // If we exhaust retries, throw the last error
    throw (
      lastError || new Error('Failed to append events after multiple attempts')
    )
  }

  /**
   * Get all events for an aggregate
   * @param aggregateId Aggregate identifier
   * @returns Array of domain events
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
   * Group events by their aggregateId
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
    console.log('🚀 ~ BaseEventSourcedRepository<T ~ grouped:', grouped)

    // Sort each group by version for correct ordering
    Object.values(grouped).forEach((group) =>
      group.sort((a, b) => a.version - b.version),
    )

    return grouped
  }

  /**
   * Rehydrate an aggregate from its events
   * @param aggregateId Aggregate identifier
   * @returns Rehydrated aggregate or null if not found
   */
  async getById(aggregateId: string): Promise<T | null> {
    const events = await this.getEventsForAggregate(aggregateId)

    if (events.length === 0) {
      return null
    }

    return this.rehydrateFromEvents(events)
  }

  /**
   * Rehydrate an aggregate from events - to be implemented by subclasses
   * @param events Array of domain events
   * @protected
   */
  protected abstract rehydrateFromEvents(events: DomainEvent[]): T | null
}
