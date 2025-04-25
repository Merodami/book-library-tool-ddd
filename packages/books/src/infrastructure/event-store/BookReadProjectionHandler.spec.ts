import {
  BOOK_VALIDATION_RESULT,
  type DomainEvent,
} from '@book-library-tool/event-store'
import { ErrorCode } from '@book-library-tool/shared'
import type { IBookReadProjectionRepository } from '@books/domain/index.js'
import { BookReadProjectionHandler } from '@books/infrastructure/event-store/BookReadProjectionHandler.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create a mock for the repository
const createMockRepository = () => ({
  getAllBooks: vi.fn(),
  getBookByIsbn: vi.fn(),
  getBookById: vi.fn(),
})

describe('BookReadProjectionHandler', () => {
  let handler: BookReadProjectionHandler
  let mockRepository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create a fresh mock repository for each test
    mockRepository = createMockRepository()

    // Initialize the handler with the mock repository
    handler = new BookReadProjectionHandler(
      mockRepository as unknown as IBookReadProjectionRepository,
    )
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
