import { EventBus } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { CreateBookCommand } from '@books/commands/CreateBookCommand.js'
import { Book } from '@books/entities/Book.js'
import { IBookRepository } from '@books/repositories/IBookRepository.js'
import { CreateBookHandler } from '@books/use_cases/commands/CreateBookHandler.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateBookHandler', () => {
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

  const handler = new CreateBookHandler(mockRepository, mockEventBus)

  const validCommand: CreateBookCommand = {
    isbn: '978-3-16-148410-0',
    title: 'Test Book',
    author: 'Test Author',
    publicationYear: 2024,
    publisher: 'Test Publisher',
    price: 29.99,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully create a book', async () => {
    // Arrange
    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)
    vi.mocked(mockRepository.saveEvents).mockResolvedValue(undefined)
    vi.mocked(mockEventBus.publish).mockResolvedValue(undefined)

    // Act
    const result = await handler.execute(validCommand)

    // Assert
    expect(result).toBeInstanceOf(Book)
    expect(result.isbn).toBe(validCommand.isbn)
    expect(result.title).toBe(validCommand.title)
    expect(result.author).toBe(validCommand.author)
    expect(result.publicationYear).toBe(validCommand.publicationYear)
    expect(result.publisher).toBe(validCommand.publisher)
    expect(result.price).toBe(validCommand.price)

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.saveEvents).toHaveBeenCalled()
    expect(mockEventBus.publish).toHaveBeenCalled()
  })

  it('should throw BOOK_ALREADY_EXISTS error when book already exists', async () => {
    // Arrange
    const existingAggregateId = 'book-123'
    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(
      existingAggregateId,
    )

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(
      new Errors.ApplicationError(
        400,
        'BOOK_ALREADY_EXISTS',
        `Book with ISBN ${validCommand.isbn} already exists.`,
      ),
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.saveEvents).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })

  it('should handle repository errors during save', async () => {
    // Arrange
    const error = new Error('Database error')
    vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)
    vi.mocked(mockRepository.saveEvents).mockRejectedValue(error)

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(error)

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.saveEvents).toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })
})
