import { BOOK_CREATED, BOOK_DELETED } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { Book, BookReadRepositoryPort } from '@books/domain/index.js'
import { get } from 'lodash-es'
import { vi } from 'vitest'

/**
 * Sample domain events for testing BookReadRepository.
 */
const sampleDomainEvents: DomainEvent[] = [
  {
    aggregateId: 'book-1',
    eventType: BOOK_CREATED,
    payload: {
      id: 'book-1',
      isbn: '978-3-16-148410-0',
      title: 'Book One',
      author: 'Author One',
      publicationYear: 2023,
      publisher: 'Publisher A',
      price: 19.99,
    },
    version: 1,
    timestamp: new Date(),
    schemaVersion: 1,
  },
  {
    aggregateId: 'book-1',
    eventType: BOOK_DELETED,
    payload: { id: 'book-1' },
    version: 2,
    timestamp: new Date(),
    schemaVersion: 1,
  },
]

/**
 * Creates a mock implementation of IBookReadRepository.
 * @param streams - Optional map of aggregateId to its event stream.
 */
export function createMockBookReadRepository(
  streams?: Record<string, DomainEvent[]>,
): BookReadRepositoryPort {
  const eventStreams: Record<string, DomainEvent[]> = streams
    ? { ...streams }
    : { 'book-1': [...sampleDomainEvents] }

  const repo: BookReadRepositoryPort = {
    /** Retrieves all events for a given aggregate. */
    getEventsForAggregate: vi
      .fn()
      .mockImplementation(async (aggregateId: string) => {
        const events = get(eventStreams, aggregateId, [])

        return [...events].sort((a, b) => a.version - b.version)
      }),

    /** Retrieves and rehydrates a Book by its aggregate ID. */
    getById: vi.fn().mockImplementation(async (aggregateId: string) => {
      const events = await repo.getEventsForAggregate(aggregateId)

      if (events.length === 0) return null

      try {
        return Book.rehydrate(events)
      } catch {
        return null
      }
    }),

    /** Finds the active aggregate ID for a Book by its natural ID (ISBN). */
    findAggregateIdById: vi.fn().mockImplementation(async (id: string) => {
      // Find all aggregates that have a creation event with matching payload.id
      const candidates = Object.entries(eventStreams).filter(([, events]) =>
        events.some(
          (e) => e.eventType === BOOK_CREATED && (e.payload as any).id === id,
        ),
      )

      if (candidates.length === 0) return null

      // For each candidate, examine last lifecycle event (created vs deleted)
      for (const [aggregateId, events] of candidates) {
        const cycle = events
          .filter(
            (e) => e.eventType === BOOK_CREATED || e.eventType === BOOK_DELETED,
          )
          .sort((a, b) => a.version - b.version)
        const last = cycle[cycle.length - 1]

        if (last.eventType !== BOOK_DELETED) {
          return aggregateId
        }
      }

      return null
    }),
  }

  return repo
}

/**
 * Clears all mock call history on the repository's methods.
 */
export function resetMockBookReadRepository(
  repo: BookReadRepositoryPort,
): void {
  for (const key of Object.keys(repo) as Array<keyof BookReadRepositoryPort>) {
    const method = get(repo, key)

    if (typeof method === 'function' && 'mockClear' in method) {
      ;(method as any).mockClear()
    }
  }
}

/**
 * Creates a repository that throws an error on every method.
 * @param message - Optional custom error message.
 */
export function createErrorMockBookReadRepository(
  message = 'Mock repository error',
): BookReadRepositoryPort {
  const error = new Error(message)

  return {
    getEventsForAggregate: vi.fn().mockRejectedValue(error),
    getById: vi.fn().mockRejectedValue(error),
    findAggregateIdById: vi.fn().mockRejectedValue(error),
  }
}
