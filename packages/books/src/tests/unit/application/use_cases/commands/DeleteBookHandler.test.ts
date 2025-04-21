import {
  BOOK_CREATED,
  BOOK_DELETED,
  type DomainEvent,
  type EventBus,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Book } from '@books/entities/Book.js'
import type { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import type { IBookRepository } from '@books/repositories/IBookRepository.js'
import type { DeleteBookCommand } from '@books/use_cases/commands/DeleteBookCommand.js'
import { DeleteBookHandler } from '@books/use_cases/commands/DeleteBookHandler.js'
import { randomUUID } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('DeleteBookHandler', () => {
  let repository: IBookRepository
  let projectionRepository: IBookProjectionRepository
  let eventBus: EventBus
  let handler: DeleteBookHandler

  const bookId = randomUUID()
  const aggregateId = bookId // Now the ID is the same

  const baseEvents: DomainEvent[] = [
    {
      aggregateId,
      eventType: BOOK_CREATED,
      payload: {
        isbn: '978-3-16-148410-0',
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
      findAggregateIdById: vi.fn().mockResolvedValue(aggregateId),
      getEventsForAggregate: vi.fn().mockResolvedValue(baseEvents),
      saveEvents: vi.fn().mockResolvedValue(undefined),
      appendBatch: vi.fn().mockResolvedValue(undefined),
    } as unknown as IBookRepository

    projectionRepository = {
      getBookById: vi.fn().mockResolvedValue({
        id: bookId,
        isbn: '978-3-16-148410-0',
        title: 'Orig',
        author: 'Auth',
        publicationYear: 2023,
        publisher: 'Pub',
        price: 15,
      }),
    } as unknown as IBookProjectionRepository

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

    handler = new DeleteBookHandler(repository, projectionRepository, eventBus)
  })

  it('successfully deletes an existing book', async () => {
    const fakeBook = Object.assign(Object.create(Book.prototype), {
      id: aggregateId,
      version: 1,
      deletedAt: undefined,
      clearDomainEvents: vi.fn(),
      isDeleted: vi.fn().mockReturnValue(false),
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

    const command: DeleteBookCommand = { id: bookId }
    const result = await handler.execute(command)

    expect(result).toEqual({
      success: true,
      bookId: aggregateId,
      version: fakeBook.version,
    })
    expect(projectionRepository.getBookById).toHaveBeenCalledWith(bookId)
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

  it('throws ApplicationError if book not found in projection', async () => {
    vi.spyOn(projectionRepository, 'getBookById').mockResolvedValue(null)

    const command: DeleteBookCommand = { id: bookId }

    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${bookId} not found`,
      ),
    )

    expect(repository.getEventsForAggregate).not.toHaveBeenCalled()
  })

  it('throws ApplicationError if no events found', async () => {
    vi.spyOn(repository, 'getEventsForAggregate').mockResolvedValue([])

    const command: DeleteBookCommand = { id: bookId }

    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with id ${bookId} not found.`,
      ),
    )
  })

  it('throws ApplicationError if book is already deleted', async () => {
    const fakeBook = Object.assign(Object.create(Book.prototype), {
      id: aggregateId,
      version: 1,
      deletedAt: new Date(),
      clearDomainEvents: vi.fn(),
      isDeleted: vi.fn().mockReturnValue(true),
    }) as Book

    vi.spyOn(Book, 'rehydrate').mockReturnValue(fakeBook)

    const command: DeleteBookCommand = { id: bookId }

    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with id ${bookId} already deleted.`,
      ),
    )
  })
})
