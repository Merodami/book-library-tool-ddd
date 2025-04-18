import {
  BOOK_CREATED,
  BOOK_DELETED,
  type DomainEvent,
  type EventBus,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Book } from '@books/entities/Book.js'
import type { IBookRepository } from '@books/repositories/IBookRepository.js'
import type { DeleteBookCommand } from '@books/use_cases/commands/DeleteBookCommand.js'
import { DeleteBookHandler } from '@books/use_cases/commands/DeleteBookHandler.js'
import { randomUUID } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('DeleteBookHandler', () => {
  let repository: IBookRepository
  let eventBus: EventBus
  let handler: DeleteBookHandler

  const isbn = '978-3-16-148410-0'
  const aggregateId = randomUUID()

  const baseEvents: DomainEvent[] = [
    {
      aggregateId,
      eventType: BOOK_CREATED,
      payload: {
        isbn,
        title: 'Orig',
        author: 'Auth',
        publicationYear: 2023,
        publisher: 'Pub',
        price: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    },
  ]

  beforeEach(() => {
    repository = {
      findAggregateIdByISBN: vi.fn().mockResolvedValue(aggregateId),
      getEventsForAggregate: vi.fn().mockResolvedValue(baseEvents),
      saveEvents: vi.fn().mockResolvedValue(undefined),
    } as unknown as IBookRepository

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
    } as unknown as EventBus

    handler = new DeleteBookHandler(repository, eventBus)
  })

  it('successfully deletes an existing book', async () => {
    const fakeBook = Object.assign(Object.create(Book.prototype), {
      id: aggregateId,
      version: 1,
      deletedAt: undefined,
      clearDomainEvents: vi.fn(),
    }) as Book

    const deleteEvt: DomainEvent = {
      aggregateId,
      eventType: BOOK_DELETED,
      payload: { deletedAt: expect.any(String as any) },
      timestamp: expect.any(Date as any),
      version: 2,
      schemaVersion: 1,
    }

    vi.spyOn(Book, 'rehydrate').mockReturnValue(fakeBook)
    fakeBook.delete = vi
      .fn()
      .mockReturnValue({ book: fakeBook, event: deleteEvt })

    const command: DeleteBookCommand = { isbn }
    const result = await handler.execute(command)

    expect(result).toBe(true)
    expect(repository.findAggregateIdByISBN).toHaveBeenCalledWith(isbn)
    expect(repository.getEventsForAggregate).toHaveBeenCalledWith(aggregateId)
    expect(Book.rehydrate).toHaveBeenCalledWith(baseEvents)
    expect(fakeBook.delete).toHaveBeenCalled()
    expect(repository.saveEvents).toHaveBeenCalledWith(
      aggregateId,
      [deleteEvt],
      fakeBook.version,
    )
    expect(eventBus.publish).toHaveBeenCalledWith(deleteEvt)
    expect(fakeBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('throws ApplicationError if ISBN not found', async () => {
    vi.spyOn(repository, 'findAggregateIdByISBN').mockResolvedValue(null)

    const command: DeleteBookCommand = { isbn }

    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with isbn ${isbn} not found.`,
      ),
    )

    expect(repository.getEventsForAggregate).not.toHaveBeenCalled()
  })

  it('throws ApplicationError if no events found', async () => {
    vi.spyOn(repository, 'getEventsForAggregate').mockResolvedValue([])

    const command: DeleteBookCommand = { isbn }

    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with isbn ${isbn} not found.`,
      ),
    )
  })

  it('throws ApplicationError if book is already deleted', async () => {
    const fakeBook = Object.assign(Object.create(Book.prototype), {
      id: aggregateId,
      version: 1,
      deletedAt: new Date(),
      clearDomainEvents: vi.fn(),
    }) as Book

    vi.spyOn(Book, 'rehydrate').mockReturnValue(fakeBook)

    const command: DeleteBookCommand = { isbn }

    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with isbn ${isbn} already deleted.`,
      ),
    )
  })
})
