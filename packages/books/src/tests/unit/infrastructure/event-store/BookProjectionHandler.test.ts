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
  findBookForReservation: vi.fn(),
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
        aggregateId: 'book-123',
        payload: {
          id: 'book-123',
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
        id: 'book-123',
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
        aggregateId: 'book-123',
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
        'book-123',
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
        aggregateId: 'book-123',
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
        'book-123',
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
        aggregateId: 'book-123',
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
        'book-123',
        event.timestamp,
      )
    })
  })

  describe('handleReservationValidateBook', () => {
    it('should return valid book validation result when book exists', async () => {
      const event: DomainEvent = {
        eventType: 'ReservationBookValidation',
        aggregateId: 'reservation-123',
        payload: {
          reservationId: 'reservation-123',
          isbn: '978-1234567890',
        },
        timestamp: new Date('2023-01-04T12:00:00Z'),
        version: 1,
        schemaVersion: 1,
      }

      // Mock the findBookForReservation response to return a book
      mockRepository.findBookForReservation.mockResolvedValue({
        id: 'book-123',
        isbn: '978-1234567890',
        title: 'Test Book',
        price: 29.99,
      })

      const result = await handler.handleReservationValidateBook(event)

      expect(mockRepository.findBookForReservation).toHaveBeenCalledTimes(1)
      expect(mockRepository.findBookForReservation).toHaveBeenCalledWith(
        '978-1234567890',
      )

      expect(result).toEqual({
        eventType: BOOK_VALIDATION_RESULT,
        aggregateId: '978-1234567890',
        payload: {
          reservationId: 'reservation-123',
          isbn: '978-1234567890',
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
        aggregateId: 'reservation-123',
        payload: {
          reservationId: 'reservation-123',
          isbn: '978-1234567890',
        },
        timestamp: new Date('2023-01-04T12:00:00Z'),
        version: 1,
        schemaVersion: 1,
      }

      // Mock the findBookForReservation response to return null (book not found)
      mockRepository.findBookForReservation.mockResolvedValue(null)

      const result = await handler.handleReservationValidateBook(event)

      expect(mockRepository.findBookForReservation).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        eventType: BOOK_VALIDATION_RESULT,
        aggregateId: '978-1234567890',
        payload: {
          reservationId: 'reservation-123',
          isbn: '978-1234567890',
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
