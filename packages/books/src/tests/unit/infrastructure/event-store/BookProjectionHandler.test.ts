import {
  BOOK_VALIDATION_RESULT,
  DomainEvent,
} from '@book-library-tool/event-store'
import { ErrorCode } from '@book-library-tool/shared'
import { BookProjectionHandler } from '@books/event-store/BookProjectionHandler.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create a mock for the repository
const createMockRepository = () => ({
  // Query methods from the base repository interface
  getAllBooks: vi.fn(),
  getBookByISBN: vi.fn(),
  getBookById: vi.fn(),

  // Event-specific methods from the extended interface
  saveBookProjection: vi.fn().mockResolvedValue(undefined),
  updateBookProjection: vi.fn().mockResolvedValue(undefined),
  markAsDeleted: vi.fn().mockResolvedValue(undefined),
})

describe('BookProjectionHandler', () => {
  let handler: BookProjectionHandler
  let mockRepository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create a fresh mock repository for each test
    mockRepository = createMockRepository()

    // Initialize the handler with the mock repository
    handler = new BookProjectionHandler(
      mockRepository as unknown as IBookProjectionRepository,
    )
  })

  describe('handleBookCreated', () => {
    it('should save a new book projection when BookCreated event is received', async () => {
      const event: DomainEvent = {
        eventType: 'BookCreated',
        aggregateId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        payload: {
          id: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
          isbn: '978-1234567890',
          title: 'Test Book',
          author: 'Test Author',
          publicationYear: 2023,
          publisher: 'Test Publisher',
          price: 29.99,
        },
        timestamp: new Date('2023-01-01T12:00:00Z'),
        version: 1,
        schemaVersion: 1,
      }

      await handler.handleBookCreated(event)

      expect(mockRepository.saveBookProjection).toHaveBeenCalledTimes(1)
      expect(mockRepository.saveBookProjection).toHaveBeenCalledWith({
        id: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        isbn: '978-1234567890',
        title: 'Test Book',
        author: 'Test Author',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 29.99,
      })
    })
  })

  describe('handleBookUpdated', () => {
    it('should update an existing book projection when BookUpdated event is received', async () => {
      const event: DomainEvent = {
        eventType: 'BookUpdated',
        aggregateId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        payload: {
          previous: {
            title: 'Old Title',
            author: 'Old Author',
            publicationYear: 2022,
            publisher: 'Old Publisher',
            price: 19.99,
          },
          updated: {
            title: 'New Title',
            author: 'New Author',
            publicationYear: 2023,
            publisher: 'New Publisher',
            price: 29.99,
          },
          updatedAt: '2023-01-02T12:00:00Z',
        },
        timestamp: new Date('2023-01-02T12:00:00Z'),
        version: 2,
        schemaVersion: 1,
      }

      await handler.handleBookUpdated(event)

      expect(mockRepository.updateBookProjection).toHaveBeenCalledTimes(1)
      expect(mockRepository.updateBookProjection).toHaveBeenCalledWith(
        '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        {
          title: 'New Title',
          author: 'New Author',
          publicationYear: 2023,
          publisher: 'New Publisher',
          price: 29.99,
          updatedAt: event.timestamp, // Date object, not string
        },
        event.timestamp, // Include the third parameter
      )
    })

    it('should only update fields that have changed', async () => {
      const event: DomainEvent = {
        eventType: 'BookUpdated',
        aggregateId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        payload: {
          previous: {
            title: 'Old Title',
            author: 'Old Author',
            publicationYear: 2022,
            publisher: 'Old Publisher',
            price: 19.99,
          },
          updated: {
            title: 'New Title',
            // Only title is updated
          },
          updatedAt: '2023-01-02T12:00:00Z',
        },
        timestamp: new Date('2023-01-02T12:00:00Z'),
        version: 2,
        schemaVersion: 1,
      }

      await handler.handleBookUpdated(event)

      expect(mockRepository.updateBookProjection).toHaveBeenCalledTimes(1)
      expect(mockRepository.updateBookProjection).toHaveBeenCalledWith(
        '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        {
          title: 'New Title',
          updatedAt: event.timestamp, // Date object, not string
        },
        event.timestamp, // Include the third parameter
      )
    })
  })

  describe('handleBookDeleted', () => {
    it('should mark a book as deleted when BookDeleted event is received', async () => {
      const event: DomainEvent = {
        eventType: 'BookDeleted',
        aggregateId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        payload: {
          deletedAt: '2023-01-03T12:00:00Z',
        },
        timestamp: new Date('2023-01-03T12:00:00Z'),
        version: 3,
        schemaVersion: 1,
      }

      await handler.handleBookDeleted(event)

      expect(mockRepository.markAsDeleted).toHaveBeenCalledTimes(1)
      expect(mockRepository.markAsDeleted).toHaveBeenCalledWith(
        '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        event.timestamp,
      )
    })
  })

  describe('handleValidateBook', () => {
    it('should return valid book validation result when book exists', async () => {
      const event: DomainEvent = {
        eventType: 'ReservationBookValidation',
        aggregateId: 'aa0e8b9b-e53a-429c-8022-c888d29b998c',
        payload: {
          bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
          reservationId: 'aa0e8b9b-e53a-429c-8022-c888d29b998c',
          isbn: '978-1234567890',
        },
        timestamp: new Date('2023-01-04T12:00:00Z'),
        version: 1,
        schemaVersion: 1,
      }

      // Mock the getBookById response to return a book
      mockRepository.getBookById.mockResolvedValue({
        id: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        isbn: '978-1234567890',
        title: 'Test Book',
        price: 29.99,
      })

      const result = await handler.handleValidateBook(event)

      expect(mockRepository.getBookById).toHaveBeenCalledTimes(1)
      expect(mockRepository.getBookById).toHaveBeenCalledWith(
        '5a0e8b9b-e53a-429c-8022-c888d29b998c',
      )

      expect(result).toEqual({
        eventType: BOOK_VALIDATION_RESULT,
        aggregateId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
        payload: {
          bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
          reservationId: 'aa0e8b9b-e53a-429c-8022-c888d29b998c',
          isValid: true,
          reason: null,
          retailPrice: 29.99,
        },
        timestamp: expect.any(Date),
        version: 1,
        schemaVersion: 1,
      })
    })

    it('should return invalid book validation result when book does not exist', async () => {
      const event: DomainEvent = {
        eventType: 'ReservationBookValidation',
        aggregateId: 'aa0e8b9b-e53a-429c-8022-c888d29b998c',
        payload: {
          bookId: '46decb22-c152-482b-909e-693c20e416a6',
          reservationId: 'aa0e8b9b-e53a-429c-8022-c888d29b998c',
          isbn: '978-1234567890',
        },
        timestamp: new Date('2023-01-04T12:00:00Z'),
        version: 1,
        schemaVersion: 1,
      }

      // Mock the getBookById response to return null (book not found)
      mockRepository.getBookById.mockResolvedValue(null)

      const result = await handler.handleValidateBook(event)

      expect(mockRepository.getBookById).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        eventType: BOOK_VALIDATION_RESULT,
        aggregateId: '46decb22-c152-482b-909e-693c20e416a6',
        payload: {
          reservationId: 'aa0e8b9b-e53a-429c-8022-c888d29b998c',
          bookId: '46decb22-c152-482b-909e-693c20e416a6',
          isValid: false,
          reason: ErrorCode.BOOK_NOT_FOUND,
          retailPrice: null,
        },
        timestamp: expect.any(Date),
        version: 1,
        schemaVersion: 1,
      })
    })
  })
})
