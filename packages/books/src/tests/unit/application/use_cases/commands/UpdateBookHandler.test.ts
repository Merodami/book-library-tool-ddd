import { EventBus } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { ErrorCode } from '@book-library-tool/shared/src/errorCodes.js'
import { UpdateBookCommand } from '@books/commands/UpdateBookCommand.js'
import { UpdateBookHandler } from '@books/commands/UpdateBookHandler.js'
import { Book } from '@books/entities/Book.js'
import { IBookRepository } from '@books/repositories/IBookRepository.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateBookHandler', () => {
  let mockRepository: IBookRepository
  let mockEventBus: EventBus
  let handler: UpdateBookHandler
  let mockDomainEvent: any
  let mockBook: Partial<Book>
  let mockUpdatedBook: Partial<Book>

  const aggregateId = 'test-aggregate-id'
  const events = [
    {
      aggregateId,
      eventType: 'BookCreated',
      payload: {
        isbn: '978-3-16-148410-0',
        title: 'Original Title',
        author: 'Original Author',
        publicationYear: 2023,
        publisher: 'Original Publisher',
        price: 19.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    },
  ]

  const validCommand: UpdateBookCommand = {
    isbn: '978-3-16-148410-0',
    title: 'Updated Title',
    author: 'Updated Author',
    publicationYear: 2024,
    publisher: 'Updated Publisher',
    price: 29.99,
  }

  beforeEach(() => {
    mockRepository = {
      saveEvents: vi.fn().mockResolvedValue(undefined),
      appendBatch: vi.fn().mockResolvedValue(undefined),
      getEventsForAggregate: vi.fn().mockResolvedValue(events),
      findAggregateIdByISBN: vi.fn().mockResolvedValue(aggregateId),
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

    mockBook = {
      id: aggregateId,
      version: 0,
      update: vi.fn(),
      clearDomainEvents: vi.fn(),
    }

    mockUpdatedBook = {
      id: aggregateId,
      version: 1,
      clearDomainEvents: vi.fn(),
    }

    mockDomainEvent = {
      aggregateId,
      eventType: 'BookUpdated',
      payload: {
        previous: {
          title: 'Original Title',
          author: 'Original Author',
          publicationYear: 2023,
          publisher: 'Original Publisher',
          price: 19.99,
        },
        updated: {
          title: validCommand.title,
          author: validCommand.author,
          publicationYear: validCommand.publicationYear,
          publisher: validCommand.publisher,
          price: validCommand.price,
        },
        updatedAt: expect.any(String),
      },
      timestamp: expect.any(Date),
      version: 1,
      schemaVersion: 1,
    }

    vi.spyOn(Book, 'rehydrate').mockReturnValue(mockBook as Book)
    ;(mockBook.update as any).mockReturnValue({
      book: mockUpdatedBook,
      event: mockDomainEvent,
    })

    handler = new UpdateBookHandler(mockRepository, mockEventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should update a book and return it when the ISBN exists', async () => {
    // Act
    const result = await handler.execute(validCommand)

    // Assert
    expect(result).toBe(mockUpdatedBook)
    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).toHaveBeenCalledWith(
      aggregateId,
    )
    expect(Book.rehydrate).toHaveBeenCalledWith(events)
    expect(mockBook.update).toHaveBeenCalledWith({
      title: validCommand.title,
      author: validCommand.author,
      publicationYear: validCommand.publicationYear,
      publisher: validCommand.publisher,
      price: validCommand.price,
    })
    expect(mockRepository.appendBatch).toHaveBeenCalledWith(
      aggregateId,
      [mockDomainEvent],
      0,
    )
    expect(mockEventBus.publish).toHaveBeenCalledWith(mockDomainEvent)
    expect(mockUpdatedBook.clearDomainEvents).toHaveBeenCalled()
  })

  it('should throw an error when the ISBN does not exist', async () => {
    // Arrange
    mockRepository.findAggregateIdByISBN = vi.fn().mockResolvedValue(null)

    // Act & Assert
    await expect(handler.execute(validCommand)).rejects.toThrow(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ISBN ${validCommand.isbn} not found`,
      ),
    )

    expect(mockRepository.findAggregateIdByISBN).toHaveBeenCalledWith(
      validCommand.isbn,
    )
    expect(mockRepository.getEventsForAggregate).not.toHaveBeenCalled()
    expect(Book.rehydrate).not.toHaveBeenCalled()
    expect(mockBook.update).not.toHaveBeenCalled()
    expect(mockRepository.appendBatch).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })
})
