import {
  BOOK_CREATED,
  BOOK_UPDATED,
  type DomainEvent,
  type EventBus,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Book } from '@books/entities/Book.js'
import type { IBookRepository } from '@books/repositories/IBookRepository.js'
import { UpdateBookCommand } from '@books/use_cases/commands/UpdateBookCommand.js'
import { UpdateBookHandler } from '@books/use_cases/commands/UpdateBookHandler.js'
import { randomUUID } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateBookHandler Unit Tests', () => {
  let repository: IBookRepository
  let eventBus: EventBus
  let handler: UpdateBookHandler

  const isbn = '978-3-16-148410-0'
  const aggregateId = randomUUID()

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
    isbn,
    title: 'Updated Title',
    author: 'Updated Author',
    publicationYear: 2024,
    publisher: 'Updated Pub',
    price: 20,
  }

  beforeEach(() => {
    repository = {
      findAggregateIdByISBN: vi.fn().mockResolvedValue(aggregateId),
      getEventsForAggregate: vi.fn().mockResolvedValue(baseEvents),
      saveEvents: vi.fn().mockResolvedValue(undefined),
    } as unknown as IBookRepository

    eventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventBus

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

    // Execute
    const result = await handler.execute(validCommand)

    // Assertions
    expect(result).toBe(fakeBook)
    expect(repository.findAggregateIdByISBN).toHaveBeenCalledWith(isbn)
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

  it('throws BOOK_NOT_FOUND when ISBN missing', async () => {
    vi.spyOn(repository, 'findAggregateIdByISBN').mockResolvedValue(null)
    await expect(handler.execute(validCommand)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ISBN ${isbn} not found`,
      ),
    )
  })

  it('throws BOOK_NOT_FOUND when no events', async () => {
    vi.spyOn(repository, 'getEventsForAggregate').mockResolvedValue([])
    await expect(handler.execute(validCommand)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ISBN ${isbn} not found`,
      ),
    )
  })

  it('throws BOOK_ALREADY_DELETED when already deleted', async () => {
    const deletedBook = Object.assign(Object.create(Book.prototype), {
      id: aggregateId,
      version: 1,
      deletedAt: new Date(),
      clearDomainEvents: vi.fn(),
    }) as Book

    vi.spyOn(Book, 'rehydrate').mockReturnValue(deletedBook)

    await expect(handler.execute(validCommand)).rejects.toEqual(
      new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with ISBN ${isbn} already deleted`,
      ),
    )
  })
})
