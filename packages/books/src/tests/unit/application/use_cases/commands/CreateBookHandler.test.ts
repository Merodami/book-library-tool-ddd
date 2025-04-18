import {
  BOOK_CREATED,
  type DomainEvent,
  type EventBus,
} from '@book-library-tool/event-store'
import { Book, PaginatedBookResponse } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Book as BookEntity } from '@books/entities/Book.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import type { IBookRepository } from '@books/repositories/IBookRepository.js'
import type { CreateBookCommand } from '@books/use_cases/commands/CreateBookCommand.js'
import { CreateBookHandler } from '@books/use_cases/commands/CreateBookHandler.js'
import { randomUUID } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateBookHandler', () => {
  let repository: IBookRepository
  let mockProjectionRepository: IBookProjectionRepository
  let eventBus: EventBus
  let handler: CreateBookHandler
  let mockBooks: Book[]
  let mockPaginatedResponse: PaginatedBookResponse

  const command: CreateBookCommand = {
    isbn: '978-3-16-148410-0',
    title: 'New Book',
    author: 'Author',
    publicationYear: 2025,
    publisher: 'Publisher',
    price: 49.99,
  }

  beforeEach(() => {
    repository = {
      findAggregateIdByISBN: vi.fn().mockResolvedValue(null),
      saveEvents: vi.fn().mockResolvedValue(undefined),
    } as unknown as IBookRepository

    mockBooks = [
      {
        isbn: '978-3-16-148410-0',
        title: 'Test Book 1',
        author: 'Test Author 1',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 19.99,
      },
      {
        isbn: '978-3-16-148410-1',
        title: 'Test Book 2',
        author: 'Test Author 2',
        publicationYear: 2024,
        publisher: 'Test Publisher',
        price: 29.99,
      },
    ] as Book[]

    mockPaginatedResponse = {
      data: mockBooks,
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    }

    mockProjectionRepository = {
      getBookByISBN: vi.fn().mockResolvedValue(null),
      getAllBooks: vi.fn().mockResolvedValue(mockPaginatedResponse),
      saveProjection: vi.fn().mockResolvedValue(undefined),
      updateProjection: vi.fn().mockResolvedValue(undefined),
      markAsDeleted: vi.fn().mockResolvedValue(undefined),
      findBookForReservation: vi.fn().mockResolvedValue(null),
    }

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

    handler = new CreateBookHandler(
      repository,
      mockProjectionRepository,
      eventBus,
    )
  })

  it('creates a new book when ISBN does not exist', async () => {
    // Arrange fake book and event
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
        isbn: command.isbn,
        title: command.title,
        author: command.author,
        publicationYear: command.publicationYear,
        publisher: command.publisher,
        price: command.price,
        createdAt: expect.any(String as any),
        updatedAt: expect.any(String as any),
      },
      timestamp: expect.any(Date as any),
      version: 1,
      schemaVersion: 1,
    }

    // Spy on Book.create
    vi.spyOn(BookEntity, 'create').mockReturnValue({
      book: fakeBook,
      event: fakeEvent,
    })

    // Act
    const result = await handler.execute(command)

    // Assert
    expect(result).toBe(fakeBook)
    expect(repository.findAggregateIdByISBN).toHaveBeenCalledWith(command.isbn)
    expect(BookEntity.create).toHaveBeenCalledWith(command)
    expect(repository.saveEvents).toHaveBeenCalledWith(fakeId, [fakeEvent], 0)
    expect(eventBus.publish).toHaveBeenCalledWith(fakeEvent)
    expect(fakeBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('throws ApplicationError when ISBN already exists', async () => {
    // Arrange existing aggregate
    vi.spyOn(repository, 'findAggregateIdByISBN').mockResolvedValue(
      'existing-id',
    )

    // Act & Assert
    await expect(handler.execute(command)).rejects.toEqual(
      new Errors.ApplicationError(
        400,
        ErrorCode.BOOK_ALREADY_EXISTS,
        `Book with ISBN ${command.isbn} already exists.`,
      ),
    )

    expect(BookEntity.create).not.toHaveBeenCalled()
    expect(repository.saveEvents).not.toHaveBeenCalled()
    expect(eventBus.publish).not.toHaveBeenCalled()
  })
})
