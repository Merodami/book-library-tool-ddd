import {
  BOOK_CREATED,
  type DomainEvent,
  type IEventBus,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { CreateBookCommand } from '@books/application/index.js'
import { CreateBookHandler } from '@books/application/index.js'
import type { IBookWriteRepository } from '@books/domain/index.js'
import { Book as BookEntity } from '@books/domain/index.js'
import { randomUUID } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateBookHandler', () => {
  let repository: IBookWriteRepository
  let eventBus: IEventBus
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
    repository = {
      save: vi.fn(),
      getEventsForAggregate: vi.fn(),
      saveEvents: vi.fn(),
    } as unknown as IBookWriteRepository
    eventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus

    // Create a spy on BookEntity.create BEFORE creating the handler
    vi.spyOn(BookEntity, 'create')

    handler = new CreateBookHandler(repository, eventBus)
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
    expect(repository.getEventsForAggregate).toHaveBeenCalledWith(cmd.isbn)
    expect(BookEntity.create).toHaveBeenCalledWith(cmd)
    expect(repository.saveEvents).toHaveBeenCalledWith(fakeId, [fakeEvent], 0)
    expect(eventBus.publish).toHaveBeenCalledWith(fakeEvent)
    expect(fakeBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('throws ApplicationError 409 if ISBN already exists', async () => {
    // Reset the mock to ensure it's clean
    vi.mocked(BookEntity.create).mockReset()

    vi.spyOn(repository, 'getEventsForAggregate').mockResolvedValue([
      {
        aggregateId: randomUUID(),
        eventType: BOOK_CREATED,
        payload: {
          ...cmd,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        version: 1,
        schemaVersion: 1,
      },
    ])

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
