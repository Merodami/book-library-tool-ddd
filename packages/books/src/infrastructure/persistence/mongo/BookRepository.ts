import {
  BOOK_CREATED,
  BOOK_DELETED,
  type DomainEvent,
} from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { Book } from '@entities/Book.js'
import { IBookRepository } from '@repositories/IBookRepository.js'

import { BaseEventSourcedRepository } from './BaseEventSourcedRepository.js'

export class BookRepository
  extends BaseEventSourcedRepository<Book>
  implements IBookRepository
{
  protected rehydrateFromEvents(events: DomainEvent[]): Book | null {
    try {
      return Book.rehydrate(events)
    } catch (error) {
      console.error('Failed to rehydrate book:', error)
      return null
    }
  }

  /**
   * Finds the aggregateId (UUID) for a Book with the given ISBN
   * if—and only if—the latest event for that aggregate is NOT BookDeleted.
   *
   * @param isbn - The book’s ISBN (natural key).
   * @returns The aggregateId of the active Book, or null if none exists.
   */
  async findAggregateIdByISBN(isbn: string): Promise<string | null> {
    try {
      const events = await this.collection
        .find({
          'payload.isbn': isbn,
          eventType: { $in: [BOOK_CREATED] },
        })
        .sort({ version: 1 })
        .toArray()

      if (events.length === 0) return null

      const grouped: Record<string, DomainEvent[]> = {}

      for (const evt of events) {
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
        'BOOK_LOOKUP_FAILED',
        `Failed to retrieve active book for ISBN ${isbn}: ${msg}`,
      )
    }
  }
}
