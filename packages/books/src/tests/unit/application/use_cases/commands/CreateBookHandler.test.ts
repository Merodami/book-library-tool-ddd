import {
  BOOK_CREATED,
  type DomainEvent,
  type EventBus,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { CreateBookCommand } from '@books/commands/CreateBookCommand.js'
import { CreateBookHandler } from '@books/commands/CreateBookHandler.js'
import { Book as BookEntity } from '@books/entities/Book.js'
import type { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import type { IBookRepository } from '@books/repositories/IBookRepository.js'
import { randomUUID } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateBookHandler', () => {
  let repository: IBookRepository
  let projectionRepository: IBookProjectionRepository
  let eventBus: EventBus
  let handler: CreateBookHandler

  const cmd: CreateBookCommand = {
    isbn: '978-3-16-148410-0',
    title: 'New Book',
    author: 'Author',
    publicationYear: 2025,
    publisher: 'Publisher',
    price: 49.99,
  }

  beforeEach(() => {
    repository = { saveEvents: vi.fn().mockResolvedValue(undefined) } as any
    projectionRepository = {
      getBookByIsbn: vi.fn().mockResolvedValue(null),
    } as any
    eventBus = { publish: vi.fn().mockResolvedValue(undefined) } as any

    // Create a spy on BookEntity.create BEFORE creating the handler
    vi.spyOn(BookEntity, 'create')

    handler = new CreateBookHandler(repository, projectionRepository, eventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns success, bookId and version when ISBN is new', async () => {
    const fakeId = randomUUID()
    const fakeBook = Object.assign(Object.create(BookEntity.prototype), {
      id: fakeId,
      version: 1,
      clearDomainEvents: vi.fn(),
    }) as BookEntity

    const fakeEvent: DomainEvent = {
      aggregateId: fakeId,
      eventType: BOOK_CREATED,
      payload: {
        ...cmd,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      timestamp: expect.any(Date),
      version: 1,
      schemaVersion: 1,
    }

    vi.mocked(BookEntity.create).mockReturnValue({
      book: fakeBook,
      event: fakeEvent,
    })

    const res = await handler.execute(cmd)

    expect(res).toEqual({ success: true, bookId: fakeId, version: 1 })
    expect(projectionRepository.getBookByIsbn).toHaveBeenCalledWith(cmd.isbn)
    expect(BookEntity.create).toHaveBeenCalledWith(cmd)
    expect(repository.saveEvents).toHaveBeenCalledWith(fakeId, [fakeEvent], 0)
    expect(eventBus.publish).toHaveBeenCalledWith(fakeEvent)
    expect(fakeBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('throws ApplicationError 409 if ISBN already exists', async () => {
    // Reset the mock to ensure it's clean
    vi.mocked(BookEntity.create).mockReset()

    vi.spyOn(projectionRepository, 'getBookByIsbn').mockResolvedValue({
      id: randomUUID(),
      isbn: cmd.isbn,
      title: 'X',
      author: 'Y',
      publicationYear: 2024,
      publisher: 'Z',
      price: 1.23,
    })

    await expect(handler.execute(cmd)).rejects.toEqual(
      new Errors.ApplicationError(
        409,
        ErrorCode.BOOK_ALREADY_EXISTS,
        `Book with ISBN ${cmd.isbn} already exists`,
      ),
    )

    expect(BookEntity.create).not.toHaveBeenCalled()
    expect(repository.saveEvents).not.toHaveBeenCalled()
    expect(eventBus.publish).not.toHaveBeenCalled()
  })
})
