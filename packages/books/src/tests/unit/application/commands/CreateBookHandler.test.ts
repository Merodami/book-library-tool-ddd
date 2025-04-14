import { EventBus } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { CreateBookCommand } from '@books/commands/CreateBookCommand.js'
import { CreateBookHandler } from '@books/commands/CreateBookHandler.js'
import { Book } from '@books/entities/Book.js'
import { IBookRepository } from '@books/repositories/IBookRepository.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateBookHandler', () => {
  let handler: CreateBookHandler
  let mockRepository: IBookRepository
  let mockEventBus: EventBus
  let validCommand: CreateBookCommand

  beforeEach(() => {
    // Create mocks with proper types
    mockRepository = {
      saveEvents: vi.fn().mockImplementation(async () => {}),
      appendBatch: vi.fn().mockImplementation(async () => {}),
      getEventsForAggregate: vi.fn().mockImplementation(async () => []),
      findAggregateIdByISBN: vi.fn().mockImplementation(async () => null),
    } as unknown as IBookRepository

    mockEventBus = {
      publish: vi.fn().mockImplementation(async () => {}),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      init: vi.fn(),
      subscribeToAll: vi.fn(),
      shutdown: vi.fn(),
      startConsuming: vi.fn(),
    } as unknown as EventBus

    // Create handler with mocks
    handler = new CreateBookHandler(mockRepository, mockEventBus)

    // Create valid command
    validCommand = {
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 29.99,
    }
  })

  describe('execute', () => {
    it('should create a new book when ISBN does not exist', async () => {
      // Setup
      vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)
      vi.mocked(mockRepository.saveEvents).mockResolvedValue(undefined)
      vi.mocked(mockEventBus.publish).mockResolvedValue(undefined)

      // Execute
      const result = await handler.execute(validCommand)

      // Verify book was created correctly
      expect(result).toBeInstanceOf(Book)
      expect(result.isbn).toBe(validCommand.isbn)
      expect(result.title).toBe(validCommand.title)
      expect(result.author).toBe(validCommand.author)
      expect(result.publicationYear).toBe(validCommand.publicationYear)
      expect(result.publisher).toBe(validCommand.publisher)
      expect(result.price).toBe(validCommand.price)

      // Verify event persistence using book's ID
      expect(mockRepository.saveEvents).toHaveBeenCalledWith(
        result.id,
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'BookCreated',
            payload: expect.objectContaining({
              isbn: validCommand.isbn,
              title: validCommand.title,
            }),
          }),
        ]),
        0,
      )

      // Verify event publication
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'BookCreated',
        }),
      )
    })

    it('should throw error when book with ISBN already exists', async () => {
      // Setup
      vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(
        'existing-id',
      )

      // Execute & Verify
      await expect(handler.execute(validCommand)).rejects.toThrow(
        new Errors.ApplicationError(
          400,
          'BOOK_ALREADY_EXISTS',
          `Book with ISBN ${validCommand.isbn} already exists.`,
        ),
      )

      expect(mockRepository.saveEvents).not.toHaveBeenCalled()
      expect(mockEventBus.publish).not.toHaveBeenCalled()
    })

    it('should persist and publish the BookCreated event', async () => {
      // Setup
      vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)
      vi.mocked(mockRepository.saveEvents).mockResolvedValue(undefined)
      vi.mocked(mockEventBus.publish).mockResolvedValue(undefined)

      // Execute
      const result = await handler.execute(validCommand)

      // Verify book was created correctly
      expect(result).toBeInstanceOf(Book)
      expect(result.isbn).toBe(validCommand.isbn)
      expect(result.title).toBe(validCommand.title)
      expect(result.author).toBe(validCommand.author)
      expect(result.publicationYear).toBe(validCommand.publicationYear)
      expect(result.publisher).toBe(validCommand.publisher)
      expect(result.price).toBe(validCommand.price)

      // Verify event persistence using book's ID
      expect(mockRepository.saveEvents).toHaveBeenCalledWith(
        result.id,
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'BookCreated',
            payload: expect.objectContaining({
              isbn: validCommand.isbn,
              title: validCommand.title,
            }),
          }),
        ]),
        0,
      )

      // Verify event publication
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'BookCreated',
        }),
      )
    })

    it('should clear domain events after persistence and publication', async () => {
      // Setup
      vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)
      vi.mocked(mockRepository.saveEvents).mockResolvedValue(undefined)
      vi.mocked(mockEventBus.publish).mockResolvedValue(undefined)

      // Execute
      const result = await handler.execute(validCommand)

      // Verify
      expect(result.domainEvents).toHaveLength(0)
    })

    it('should handle repository errors gracefully', async () => {
      // Setup
      vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)
      vi.mocked(mockRepository.saveEvents).mockRejectedValue(
        new Error('Database error'),
      )

      // Execute & Verify
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Database error',
      )
    })

    it('should handle event bus errors gracefully', async () => {
      // Setup
      vi.mocked(mockRepository.findAggregateIdByISBN).mockResolvedValue(null)
      vi.mocked(mockRepository.saveEvents).mockResolvedValue(undefined)
      vi.mocked(mockEventBus.publish).mockRejectedValue(
        new Error('Event bus error'),
      )

      // Execute & Verify
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Event bus error',
      )
    })
  })
})
