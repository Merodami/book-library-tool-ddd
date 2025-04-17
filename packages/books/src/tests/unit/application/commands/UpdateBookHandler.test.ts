import { EventBus } from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { UpdateBookCommand } from '@books/commands/UpdateBookCommand.js'
import { Book } from '@books/entities/Book.js'
import { IBookRepository } from '@books/repositories/IBookRepository.js'
import { UpdateBookHandler } from '@books/use_cases/commands/UpdateBookHandler.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateBookHandler', () => {
  const mockRepository: IBookRepository = {
    findAggregateIdByISBN: vi.fn(),
    getEventsForAggregate: vi.fn(),
    saveEvents: vi.fn(),
    appendBatch: vi.fn(),
  }

  const mockEventBus: EventBus = {
    publish: vi.fn(),
    init: vi.fn(),
    subscribe: vi.fn(),
    subscribeToAll: vi.fn(),
    unsubscribe: vi.fn(),
    shutdown: vi.fn(),
    startConsuming: vi.fn(),
    bindEventTypes: vi.fn(),
    checkHealth: vi.fn(),
  }

  const handler = new UpdateBookHandler(mockRepository, mockEventBus)

  const validCommand: UpdateBookCommand = {
    isbn: '978-3-16-148410-0',
    title: 'Updated Title',
    author: 'Updated Author',
    publicationYear: 2024,
    publisher: 'Updated Publisher',
    price: 29.99,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully update a book', async () => {
    // Arrange
    const aggregateId = 'book-123'
    const { event: createdEvent } = Book.create({
      isbn: validCommand.isbn,
      title: 'Original Title',
      author: 'Original Author',
      publicationYear: 2020,
      publisher: 'Original Publisher',
      price: 19.99,
    })
    const events = [createdEvent]

    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(
      aggregateId,
    )
    vi.mocked(mockRepository.getEventsForAggregate).mockResolvedValue(events)
    vi.mocked(mockRepository.saveEvents).mockResolvedValue(undefined)
    vi.mocked(mockEventBus.publish).mockResolvedValue(undefined)

    // Act
    await handler.execute(validCommand)

    // Assert
    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).toHaveBeenCalledWith(
      aggregateId,
    )
    expect(mockRepository.saveEvents).toHaveBeenCalled()
    expect(mockEventBus.publish).toHaveBeenCalled()
  })

  it('should throw BOOK_NOT_FOUND error when book does not exist', async () => {
    // Arrange
    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ISBN ${validCommand.isbn} not found.`,
      ),
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).not.toHaveBeenCalled()
    expect(mockRepository.saveEvents).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })

  it('should handle repository errors during save', async () => {
    // Arrange
    const aggregateId = 'book-123'
    const { event: createdEvent } = Book.create({
      isbn: validCommand.isbn,
      title: 'Original Title',
      author: 'Original Author',
      publicationYear: 2020,
      publisher: 'Original Publisher',
      price: 19.99,
    })
    const events = [createdEvent]

    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(
      aggregateId,
    )
    vi.mocked(mockRepository.getEventsForAggregate).mockResolvedValue(events)
    vi.mocked(mockRepository.saveEvents).mockRejectedValue(
      new Error('Database error'),
    )

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(
      'Database error',
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).toHaveBeenCalledWith(
      aggregateId,
    )
    expect(mockRepository.saveEvents).toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })
})
