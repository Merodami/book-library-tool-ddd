import { EventBus } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { ErrorCode } from '@book-library-tool/shared/src/errorCodes.js'
import { CreateBookCommand } from '@books/commands/CreateBookCommand.js'
import { CreateBookHandler } from '@books/commands/CreateBookHandler.js'
import { Book } from '@books/entities/Book.js'
import { IBookRepository } from '@books/repositories/IBookRepository.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateBookHandler', () => {
  let mockRepository: IBookRepository
  let mockEventBus: EventBus
  let handler: CreateBookHandler
  let mockDomainEvent: any
  let mockBook: Partial<Book>

  const validCommand: CreateBookCommand = {
    isbn: '978-3-16-148410-0',
    title: 'Test Book',
    author: 'Test Author',
    publicationYear: 2024,
    publisher: 'Test Publisher',
    price: 29.99,
  }

  beforeEach(() => {
    mockRepository = {
      saveEvents: vi.fn().mockResolvedValue(undefined),
      appendBatch: vi.fn().mockResolvedValue(undefined),
      getEventsForAggregate: vi.fn().mockResolvedValue([]),
      findAggregateIdByISBN: vi.fn().mockResolvedValue(null),
    }

    mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      init: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      subscribeToAll: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribeFromAll: vi.fn().mockResolvedValue(undefined),
      getSubscribers: vi.fn().mockReturnValue([]),
      getAllSubscribers: vi.fn().mockReturnValue([]),
    } as unknown as EventBus

    mockDomainEvent = {
      aggregateId: 'test-id',
      eventType: 'BookCreated',
      payload: validCommand,
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    mockBook = {
      id: 'test-id',
      clearDomainEvents: vi.fn(),
    }

    vi.spyOn(Book, 'create').mockReturnValue({
      book: mockBook as Book,
      event: mockDomainEvent,
    })

    handler = new CreateBookHandler(mockRepository, mockEventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create a book and return it when the ISBN does not exist', async () => {
    // Arrange
    mockRepository.findAggregateIdByISBN = vi.fn().mockResolvedValue(null)

    // Act
    const result = await handler.execute(validCommand)

    // Assert
    expect(result).toBe(mockBook)
    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(Book.create).toHaveBeenCalledWith(validCommand)
    expect(mockRepository.saveEvents).toHaveBeenCalledWith(
      mockBook.id,
      [mockDomainEvent],
      0,
    )
    expect(mockEventBus.publish).toHaveBeenCalledWith(mockDomainEvent)
    expect(mockBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('should throw an error when the ISBN already exists', async () => {
    // Arrange
    mockRepository.findAggregateIdByISBN = vi
      .fn()
      .mockResolvedValue('existing-id')

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(
      new Errors.ApplicationError(
        400,
        ErrorCode.BOOK_ALREADY_EXISTS,
        `Book with ISBN ${validCommand.isbn} already exists.`,
      ),
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(Book.create).not.toHaveBeenCalled()
    expect(mockRepository.saveEvents).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })
})
