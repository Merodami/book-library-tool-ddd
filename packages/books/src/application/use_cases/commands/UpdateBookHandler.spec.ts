import type { EventBusPort } from '@book-library-tool/event-store'
import { BOOK_CREATED, BOOK_UPDATED } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { UpdateBookCommand } from '@books/application/index.js'
import { UpdateBookHandler } from '@books/application/index.js'
import type { BookWriteRepositoryPort } from '@books/domain/index.js'
import { Book } from '@books/domain/index.js'
import { randomUUID } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateBookHandler', () => {
  let repository: BookWriteRepositoryPort
  let eventBus: EventBusPort
  let handler: UpdateBookHandler

  const isbn = '978-3-16-148410-0'
  const bookId = randomUUID()
  const aggregateId = bookId // Same ID is used now

  // Base creation event stream
  const baseEvents: DomainEvent[] = [
    {
      aggregateId,
      eventType: BOOK_CREATED,
      payload: {
        isbn,
        title: 'Original',
        author: 'Author',
        publicationYear: 2023,
        publisher: 'Pub',
        price: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    },
  ]

  const validCommand: UpdateBookCommand = {
    id: bookId,
    title: 'Updated Title',
    author: 'Updated Author',
    publicationYear: 2024,
    publisher: 'Updated Pub',
    price: 20,
  }

  beforeEach(() => {
    repository = {
      findAggregateIdById: vi.fn().mockResolvedValue(aggregateId),
      getEventsForAggregate: vi.fn().mockResolvedValue(baseEvents),
      saveEvents: vi.fn().mockResolvedValue(undefined),
      appendBatch: vi.fn().mockResolvedValue(undefined),
    } as unknown as BookWriteRepositoryPort

    eventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      init: vi.fn(),
      subscribe: vi.fn(),
      subscribeToAll: vi.fn(),
      unsubscribe: vi.fn(),
      unsubscribeFromAll: vi.fn(),
      getSubscribers: vi.fn(),
      getAllSubscribers: vi.fn(),
      shutdown: vi.fn(),
      startConsuming: vi.fn(),
      bindEventTypes: vi.fn(),
      checkHealth: vi.fn(),
    } as unknown as EventBusPort

    handler = new UpdateBookHandler(repository, eventBus)
  })

  it('updates and publishes the BookUpdated event', async () => {
    // Initialize fake Book aggregate
    const fakeBook = Object.assign(Object.create(Book.prototype), {
      id: aggregateId,
      title: 'Original',
      author: 'Author',
      publicationYear: 2023,
      publisher: 'Pub',
      price: 10,
      createdAt: new Date(baseEvents[0].payload.createdAt),
      updatedAt: new Date(baseEvents[0].payload.updatedAt),
      version: 1,
      deletedAt: undefined,
      clearDomainEvents: vi.fn(),
    }) as Book

    // Prepare update event from domain
    const updateEvent: DomainEvent = {
      aggregateId,
      eventType: BOOK_UPDATED,
      payload: {
        previous: {
          title: 'Original',
          author: 'Author',
          publicationYear: 2023,
          publisher: 'Pub',
          price: 10,
        },
        updated: {
          title: validCommand.title,
          author: validCommand.author,
          publicationYear: validCommand.publicationYear,
          publisher: validCommand.publisher,
          price: validCommand.price,
        },
        updatedAt: expect.any(String as any),
      },
      timestamp: expect.any(Date as any),
      version: 2,
      schemaVersion: 1,
    }

    // Spy on rehydrate and update
    vi.spyOn(Book, 'rehydrate').mockReturnValue(fakeBook)

    fakeBook.update = vi
      .fn()
      .mockReturnValue({ book: fakeBook, event: updateEvent })

    const result = await handler.execute(validCommand)

    expect(result).toEqual({
      success: true,
      bookId: fakeBook.id,
      version: fakeBook.version,
    })
    expect(repository.getEventsForAggregate).toHaveBeenCalledWith(aggregateId)
    expect(Book.rehydrate).toHaveBeenCalledWith(baseEvents)
    expect(fakeBook.update).toHaveBeenCalledWith({
      title: validCommand.title,
      author: validCommand.author,
      publicationYear: validCommand.publicationYear,
      publisher: validCommand.publisher,
      price: validCommand.price,
    })
    expect(repository.saveEvents).toHaveBeenCalledWith(
      aggregateId,
      [updateEvent],
      1,
    )
    expect(eventBus.publish).toHaveBeenCalledWith(updateEvent)
    expect(fakeBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('throws BOOK_NOT_FOUND when no events', async () => {
    vi.spyOn(repository, 'getEventsForAggregate').mockResolvedValue([])
    await expect(handler.execute(validCommand)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${bookId} not found.`,
      ),
    )
  })
})
