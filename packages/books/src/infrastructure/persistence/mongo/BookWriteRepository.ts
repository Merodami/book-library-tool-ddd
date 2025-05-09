import {
  MongoDatabaseService,
  MongoWriteRepository,
} from '@book-library-tool/database'
import { BOOK_CREATED, BOOK_DELETED } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { Book, BookWriteRepositoryPort } from '@books/domain/index.js'
import { Collection } from 'mongodb'

/**
 * Event-sourced repository implementation for the Book aggregate.
 * This repository is responsible for persisting and retrieving Book aggregates
 * using event sourcing. It extends BaseEventSourcedRepository to handle
 * the event storage and replay functionality.
 *
 * Unlike BookProjectionRepository which handles read operations, this repository
 * is part of the write model in the CQRS pattern and manages the event stream
 * for Book aggregates.
 */
export class BookWriteRepository
  extends MongoWriteRepository<Book>
  implements BookWriteRepositoryPort
{
  constructor(
    protected readonly collection: Collection<DomainEvent>,
    protected readonly dbService: MongoDatabaseService,
  ) {
    super(collection, dbService)
  }

  /**
   * Rehydrates a Book aggregate from its event stream.
   * This method is called by the base repository to reconstruct the aggregate's
   * state by applying all events in sequence.
   *
   * @param events - The sequence of domain events that represent the aggregate's history
   * @returns The reconstructed Book aggregate, or null if rehydration fails
   */
  protected rehydrateFromEvents(events: DomainEvent[]): Book | null {
    try {
      return Book.rehydrate(events)
    } catch (error) {
      logger.error('Failed to rehydrate book:', error)

      return null
    }
  }

  /**
   * Finds the active aggregate ID for a Book by its ISBN.
   * This method is crucial for the event sourcing pattern as it:
   * 1. Locates all creation events for the given ISBN
   * 2. Groups events by aggregate ID
   * 3. Determines which aggregate is still active (not deleted)
   *
   * The method is used when commands need to operate on an existing book
   * but only have the ISBN (natural key) available.
   *
   * @param isbn - The book's ISBN (natural key)
   * @returns The UUID of the active Book aggregate, or null if no active book exists
   * @throws {ApplicationError} If there's an error during the lookup process
   */
  async findAggregateIdById(id: string): Promise<string | null> {
    try {
      // First find any books with this ID in their payload
      const createdEvents = await this.collection
        .find({
          'payload.id': id,
          eventType: BOOK_CREATED,
        })
        .toArray()

      if (createdEvents.length === 0) return null

      // Now get all events for these aggregates
      const aggregateIds = createdEvents.map((e) => e.aggregateId)

      const allEvents = await this.collection
        .find({
          aggregateId: { $in: aggregateIds },
          eventType: { $in: [BOOK_CREATED, BOOK_DELETED] },
        })
        .sort({ aggregateId: 1, version: 1 })
        .toArray()

      const grouped: Record<string, DomainEvent[]> = {}

      for (const evt of allEvents) {
        ;(grouped[evt.aggregateId] ??= []).push(evt)
      }

      for (const [aggregateId, eventList] of Object.entries(grouped)) {
        const lastEvent = eventList[eventList.length - 1]

        if (lastEvent.eventType !== BOOK_DELETED) {
          return aggregateId
        }
      }

      return null
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.BOOK_LOOKUP_FAILED,
        `Failed to retrieve active book for ID ${id}: ${msg}`,
      )
    }
  }
}
