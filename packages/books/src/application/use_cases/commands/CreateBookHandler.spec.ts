import { BOOK_CREATED, type EventBusPort } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { createMockEventBus } from '@book-library-tool/tests'
import type { CreateBookCommand } from '@books/application/index.js'
import { CreateBookHandler } from '@books/application/index.js'
import type {
  BookReadProjectionRepositoryPort,
  BookWriteRepositoryPort,
} from '@books/domain/index.js'
import { Book as BookEntity } from '@books/domain/index.js'
import {
  createMockBookReadProjectionRepository,
  createMockBookWriteRepository,
} from '@books/tests/mocks/index.js'
import { randomUUID } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateBookHandler', () => {
  let writeRepo: BookWriteRepositoryPort
  let readProjRepo: BookReadProjectionRepositoryPort
  let eventBus: EventBusPort
  let handler: CreateBookHandler

  const command: CreateBookCommand = {
    isbn: '978-3-16-148410-0',
    title: 'New Book',
    author: 'Author',
    publicationYear: 2025,
    publisher: 'Publisher',
    price: 49.99,
  }

  beforeEach(() => {
    // 1) Create clean mocks
    writeRepo = createMockBookWriteRepository()
    readProjRepo = createMockBookReadProjectionRepository()
    eventBus = createMockEventBus()
    eventBus.init()

    // 2) Force “no existing book” by default
    vi.spyOn(readProjRepo, 'getBookByIsbn').mockResolvedValue(null)

    // 3) Spy on the domain factory
    vi.spyOn(BookEntity, 'create')

    handler = new CreateBookHandler(writeRepo, readProjRepo, eventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns success, bookId and version when ISBN is new', async () => {
    // --- arrange ---
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
        ...command,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      timestamp: expect.any(Date),
      version: 1,
      schemaVersion: 1,
    }

    // stub the factory
    vi.mocked(BookEntity.create).mockReturnValue({
      book: fakeBook,
      event: fakeEvent,
    })

    // --- act ---
    const result = await handler.execute(command)

    // --- assert ---
    expect(result).toEqual({
      success: true,
      bookId: fakeId,
      version: 1,
    })

    // uniqueness check
    expect(readProjRepo.getBookByIsbn).toHaveBeenCalledWith(
      command.isbn,
      undefined,
      true,
    )

    // domain creation
    expect(BookEntity.create).toHaveBeenCalledWith(command)

    // persistence
    expect(writeRepo.saveEvents).toHaveBeenCalledWith(fakeId, [fakeEvent], 0)

    // publication
    expect(eventBus.publish).toHaveBeenCalledWith(fakeEvent)

    // cleanup
    expect(fakeBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('throws ApplicationError 409 if ISBN already exists', async () => {
    // arrange: projection already has that ISBN
    vi.spyOn(readProjRepo, 'getBookByIsbn').mockResolvedValue({} as any)

    // act + assert
    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        409,
        ErrorCode.BOOK_ALREADY_EXISTS,
        `Book with ISBN ${command.isbn} already exists`,
      ),
    )

    // domain factory & write side should never be called
    expect(BookEntity.create).not.toHaveBeenCalled()
    expect(writeRepo.saveEvents).not.toHaveBeenCalled()
    expect(eventBus.publish).not.toHaveBeenCalled()
  })
})
