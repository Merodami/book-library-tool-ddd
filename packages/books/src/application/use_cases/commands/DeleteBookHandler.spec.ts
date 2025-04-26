// packages/books/src/application/use_cases/commands/DeleteBookHandler.spec.ts
import { BOOK_DELETED, type EventBusPort } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { createMockEventBus } from '@book-library-tool/tests'
import type { BookWriteRepositoryPort } from '@books/domain/index.js'
import { Book } from '@books/domain/index.js'
import { createMockBookWriteRepository } from '@books/tests/mocks/repositories/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteBookHandler } from './DeleteBookHandler.js'

describe('DeleteBookHandler', () => {
  let writeRepo: BookWriteRepositoryPort
  let eventBus: EventBusPort
  let handler: DeleteBookHandler

  const bookId = 'agg-id-123'

  beforeEach(() => {
    writeRepo = createMockBookWriteRepository()
    eventBus = createMockEventBus()
    eventBus.init()

    handler = new DeleteBookHandler(writeRepo, eventBus)

    // override concurrency check so saveEvents always resolves
    vi.spyOn(writeRepo, 'saveEvents').mockResolvedValue(undefined)
  })

  it('successfully deletes an existing book', async () => {
    // arrange: fake aggregate returned by getById
    const fakeBook = Object.assign(Object.create(Book.prototype), {
      id: bookId,
      version: 2,
      isDeleted: vi.fn().mockReturnValue(false),
      clearDomainEvents: vi.fn(),
    }) as Book

    const deleteEvt: DomainEvent = {
      aggregateId: bookId,
      eventType: BOOK_DELETED,
      payload: { deletedAt: expect.any(String as any) },
      timestamp: expect.any(Date as any),
      version: 3,
      schemaVersion: 1,
    }

    // stub getById and domain delete()
    vi.spyOn(writeRepo, 'getById').mockResolvedValue(fakeBook)
    fakeBook.delete = vi
      .fn()
      .mockReturnValue({ book: fakeBook, event: deleteEvt })

    // act
    const result = await handler.execute({ id: bookId })

    // assert return value
    expect(result).toEqual({
      success: true,
      bookId,
      version: fakeBook.version,
    })

    // assert all interactions
    expect(writeRepo.getById).toHaveBeenCalledWith(bookId)
    expect(fakeBook.delete).toHaveBeenCalled()
    expect(writeRepo.saveEvents).toHaveBeenCalledWith(
      bookId,
      [deleteEvt],
      fakeBook.version,
    )
    expect(eventBus.publish).toHaveBeenCalledWith(deleteEvt)
    expect(fakeBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('throws 404 if the book aggregate does not exist', async () => {
    vi.spyOn(writeRepo, 'getById').mockResolvedValue(null)

    await expect(handler.execute({ id: bookId })).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${bookId} not found.`,
      ),
    )

    expect(writeRepo.getById).toHaveBeenCalledWith(bookId)
  })

  it('throws 410 if the book is already deleted', async () => {
    const deletedBook = Object.assign(Object.create(Book.prototype), {
      id: bookId,
      version: 5,
      isDeleted: vi.fn().mockReturnValue(true),
      clearDomainEvents: vi.fn(),
    }) as Book

    vi.spyOn(writeRepo, 'getById').mockResolvedValue(deletedBook)

    await expect(handler.execute({ id: bookId })).rejects.toEqual(
      new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with ID ${bookId} already deleted.`,
      ),
    )

    expect(writeRepo.getById).toHaveBeenCalledWith(bookId)
  })
})
