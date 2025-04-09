import { DomainEvent, EventStore } from '@book-library-tool/event-store'
import { Db, Collection } from 'mongodb'

/**
 * MongoEventStore is an enterprise-grade adapter which implements the EventStore interface.
 * It uses MongoDB as a backend and leverages optimistic concurrency via the version field.
 */
export class MongoEventStore implements EventStore {
  private readonly collection: Collection<DomainEvent>

  constructor(db: Db) {
    this.collection = db.collection('event_store')

    // Ensure a unique index on (aggregateId, version) to enforce optimistic concurrency.
    // This prevents duplicate version inserts for the same aggregate.
    this.collection
      .createIndex({ aggregateId: 1, version: 1 }, { unique: true })
      .catch((err) => {
        console.error('Failed creating index on aggregateId and version:', err)
      })
  }

  /**
   * Append a single event to the store.
   *
   * It is assumed that the event already has its version populated.
   * If a duplicate key error occurs (i.e. the event version already exists), a concurrency conflict is reported.
   *
   * @param event The domain event to append.
   */
  async append(event: DomainEvent): Promise<void> {
    try {
      await this.collection.insertOne(event)
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate key error code in MongoDB.
        throw new Error(
          `Concurrency conflict: Event for aggregate ${event.aggregateId} with version ${event.version} already exists.`,
        )
      } else {
        throw err
      }
    }
  }

  /**
   * Append a batch of events for a given aggregate.
   *
   * This method first checks that the current version for the aggregate matches the expectedVersion.
   * Then it inserts the new events atomically (in order).
   * If the concurrency check fails or a duplicate version is detected during insert,
   * an error is thrown.
   *
   * @param aggregateId The unique identifier for the aggregate.
   * @param events The batch of events to append.
   * @param expectedVersion The version of the aggregate as expected by the caller.
   */
  async appendBatch(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    // Retrieve the latest event for this aggregate to determine the current version.
    const latestEvent = await this.collection
      .find({ aggregateId })
      .sort({ version: -1 })
      .limit(1)
      .toArray()
    const currentVersion = latestEvent.length === 0 ? 0 : latestEvent[0].version

    if (currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict for aggregate ${aggregateId}: expected version ${expectedVersion} but found ${currentVersion}.`,
      )
    }

    // Attempt to insert all events in one ordered batch operation.
    try {
      if (events.length > 0) {
        await this.collection.insertMany(events, { ordered: true })
      }
    } catch (err: any) {
      if (err.code === 11000) {
        throw new Error(
          `Concurrency conflict while appending batch events for aggregate ${aggregateId}.`,
        )
      } else {
        throw err
      }
    }
  }

  /**
   * Load all events for a given aggregate, ordered by version.
   *
   * These events are used to rebuild the aggregate's state.
   *
   * @param aggregateId The unique identifier for the aggregate.
   * @returns An array of DomainEvent instances.
   */
  async load(aggregateId: string): Promise<DomainEvent[]> {
    return await this.collection
      .find({ aggregateId })
      .sort({ version: 1 })
      .toArray()
  }
}
