import { BOOK_CREATED } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { BookWriteRepositoryPort } from '@books/domain/index.js'
import { vi } from 'vitest'

/**
 * Sample events for testing. Override per-test if needed.
 */
export const mockBookEvents: DomainEvent[] = [
  {
    aggregateId: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
    eventType: BOOK_CREATED,
    version: 1,
    globalVersion: 1,
    timestamp: new Date(),
    schemaVersion: 1,
    payload: {
      id: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
      isbn: '978-3-16-148410-0',
      title: 'Book One',
      author: 'Author One',
      publicationYear: 2023,
      publisher: 'Publisher A',
      price: 19.99,
    },
    metadata: {
      correlationId: 'corr-id-1',
      stored: new Date(),
    },
  },
  {
    aggregateId: '5a1018f2-3526-4275-a84b-784e4f2e5a11',
    eventType: BOOK_CREATED,
    version: 1,
    globalVersion: 2,
    timestamp: new Date(),
    schemaVersion: 1,
    payload: {
      id: '5a1018f2-3526-4275-a84b-784e4f2e5a11',
      isbn: '978-3-16-148410-1',
      title: 'Book Two',
      author: 'Author Two',
      publicationYear: 2024,
      publisher: 'Publisher B',
      price: 29.99,
    },
    metadata: {
      correlationId: 'corr-id-2',
      stored: new Date(),
    },
  },
]

/**
 * Creates an in-memory mock of IBookWriteRepository.
 * Simulates an event-sourced repository for Book aggregates
 * with optimistic concurrency control.
 *
 * @param initialEvents - Optional starting events; defaults to `mockBookEvents`.
 */
export function createMockBookWriteRepository(
  initialEvents?: DomainEvent[],
): BookWriteRepositoryPort {
  // Deep clone to avoid mutation from outside
  const events = initialEvents ? [...initialEvents] : [...mockBookEvents]

  // Track event versions by aggregateId for concurrency checks
  const aggregateVersions = new Map<string, number>()

  // Initialize version tracking from initial events
  events.forEach((event) => {
    const currentVersion = aggregateVersions.get(event.aggregateId) || 0

    if (event.version > currentVersion) {
      aggregateVersions.set(event.aggregateId, event.version)
    }
  })

  return {
    /**
     * Mocks retrieving an aggregate by its ID
     */
    getById: vi.fn().mockImplementation(async (id: string) => {
      return events.find((e) => e.aggregateId === id)
    }),

    /**
     * Mocks retrieving events for an aggregate
     */
    getEventsForAggregate: vi
      .fn()
      .mockImplementation(async (aggregateId: string) => {
        if (!aggregateId) {
          throw new Errors.ApplicationError(
            400,
            ErrorCode.INVALID_AGGREGATE_ID,
            'Aggregate ID is required',
          )
        }

        const filteredEvents = events
          .filter((e) => e.aggregateId === aggregateId)
          .sort((a, b) => a.version - b.version)

        return Promise.resolve(filteredEvents)
      }),

    /**
     * Mocks saving events with optimistic concurrency control
     */
    saveEvents: vi
      .fn()
      .mockImplementation(
        async (
          aggregateId: string,
          newEvents: DomainEvent[],
          expectedVersion: number,
        ) => {
          if (!aggregateId) {
            throw new Errors.ApplicationError(
              400,
              ErrorCode.INVALID_AGGREGATE_ID,
              'Aggregate ID is required',
            )
          }

          if (!newEvents || newEvents.length === 0) {
            return Promise.resolve()
          }

          const currentVersion = aggregateVersions.get(aggregateId) || 0

          if (currentVersion !== expectedVersion) {
            throw new Errors.ApplicationError(
              409,
              ErrorCode.CONCURRENCY_CONFLICT,
              `Concurrency conflict for aggregate ${aggregateId}: expected version ${expectedVersion} but found ${currentVersion}.`,
            )
          }

          const maxGlobalVersion = events.reduce(
            (max, event) => Math.max(max, event.globalVersion || 0),
            0,
          )

          const nextGlobalVersion = maxGlobalVersion + 1

          const enrichedEvents = newEvents.map((event, index) => ({
            ...event,
            aggregateId,
            timestamp: event.timestamp || new Date(),
            version: expectedVersion + index + 1,
            globalVersion: nextGlobalVersion + index,
            metadata: {
              ...(event.metadata || {}),
              stored: new Date(),
              correlationId:
                event.metadata?.correlationId || 'mock-correlation-id',
            },
          }))

          events.push(...enrichedEvents)

          aggregateVersions.set(aggregateId, expectedVersion + newEvents.length)

          return Promise.resolve()
        },
      ),

    /**
     * Mocks appending a batch of events with retry logic
     */
    appendBatch: vi
      .fn()
      .mockImplementation(
        async (
          aggregateId: string,
          newEvents: DomainEvent[],
          expectedVersion: number,
        ) => {
          return Promise.resolve()
        },
      ),
  }
}

/**
 * Clears call history on all mock methods.
 * Call in your test's beforeEach() to isolate invocations.
 */
export function resetMockBookWriteRepository(
  repo: BookWriteRepositoryPort,
): void {
  for (const fn of [
    repo.getById,
    repo.getEventsForAggregate,
    repo.saveEvents,
    repo.appendBatch,
  ]) {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      vi.mocked(fn).mockClear()
    }
  }
}

/**
 * Convenience: a write repository mock with no initial events.
 */
export function createEmptyMockBookWriteRepository(): BookWriteRepositoryPort {
  return createMockBookWriteRepository([])
}

/**
 * Convenience: a write repository mock whose methods always reject.
 */
export function createErrorMockBookWriteRepository(
  errorMessage = 'Mock repository error',
): BookWriteRepositoryPort {
  const err = new Error(errorMessage)

  return {
    getById: vi.fn().mockRejectedValue(err),
    getEventsForAggregate: vi.fn().mockRejectedValue(err),
    saveEvents: vi.fn().mockRejectedValue(err),
    appendBatch: vi.fn().mockRejectedValue(err),
  }
}
