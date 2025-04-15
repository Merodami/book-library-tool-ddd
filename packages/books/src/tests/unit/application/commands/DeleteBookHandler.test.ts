import { EventBus } from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { DeleteBookCommand } from '@commands/DeleteBookCommand.js'
import { Book } from '@entities/Book.js'
import { IBookRepository } from '@repositories/IBookRepository.js'
import { DeleteBookHandler } from '@use_cases/commands/DeleteBookHandler.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('DeleteBookHandler', () => {
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

  const handler = new DeleteBookHandler(mockRepository, mockEventBus)

  const validCommand: DeleteBookCommand = {
    isbn: '978-3-16-148410-0',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully delete a book', async () => {
    // Arrange
    const aggregateId = 'book-123'
    const { event: createdEvent } = Book.create({
      isbn: validCommand.isbn,
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2024,
      publisher: 'Test Publisher',
      price: 29.99,
    })
    const events = [createdEvent]

    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(
      aggregateId,
    )
    vi.mocked(mockRepository.getEventsForAggregate).mockResolvedValue(events)
    vi.mocked(mockRepository.saveEvents).mockResolvedValue(undefined)
    vi.mocked(mockEventBus.publish).mockResolvedValue(undefined)

    // Act
    const result = await handler.execute(validCommand)

    // Assert
    expect(result).toBe(true)
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
        `Book with isbn ${validCommand.isbn} not found.`,
      ),
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).not.toHaveBeenCalled()
    expect(mockRepository.saveEvents).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })

  it('should throw BOOK_NOT_FOUND error when no events exist', async () => {
    // Arrange
    const aggregateId = 'book-123'
    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(
      aggregateId,
    )
    vi.mocked(mockRepository.getEventsForAggregate).mockResolvedValue([])

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with isbn ${validCommand.isbn} not found.`,
      ),
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).toHaveBeenCalledWith(
      aggregateId,
    )
    expect(mockRepository.saveEvents).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })

  it('should throw BOOK_ALREADY_DELETED error when book is already deleted', async () => {
    // Arrange
    const aggregateId = 'book-123'
    const { book, event: createdEvent } = Book.create({
      isbn: validCommand.isbn,
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2024,
      publisher: 'Test Publisher',
      price: 29.99,
    })
    const { event: deletedEvent } = book.delete()
    const events = [createdEvent, deletedEvent]

    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(
      aggregateId,
    )
    vi.mocked(mockRepository.getEventsForAggregate).mockResolvedValue(events)

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(
      new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with isbn ${validCommand.isbn} already deleted.`,
      ),
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).toHaveBeenCalledWith(
      aggregateId,
    )
    expect(mockRepository.saveEvents).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })

  it('should handle repository errors during save', async () => {
    // Arrange
    const aggregateId = 'book-123'
    const { book, event: createdEvent } = Book.create({
      isbn: validCommand.isbn,
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2024,
      publisher: 'Test Publisher',
      price: 29.99,
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
