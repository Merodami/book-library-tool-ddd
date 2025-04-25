import type { DomainEvent } from '@book-library-tool/event-store'
import type { IBookWriteProjectionRepository } from '@books/domain/index.js'
import { BookWriteProjectionHandler } from '@books/infrastructure/event-store/BookWriteProjectionHandler.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create a mock for the repository
const createMockRepository = () => ({
  saveBookProjection: vi.fn().mockResolvedValue(undefined),
  updateBookProjection: vi.fn().mockResolvedValue(undefined),
  markAsDeleted: vi.fn().mockResolvedValue(undefined),
})

describe('BookWriteProjectionHandler', () => {
  let handler: BookWriteProjectionHandler
  let mockRepository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create a fresh mock repository for each test
    mockRepository = createMockRepository()

    // Initialize the handler with the mock repository
    handler = new BookWriteProjectionHandler(
      mockRepository as unknown as IBookWriteProjectionRepository,
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
          updatedAt: event.timestamp,
        },
        event.timestamp,
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
          updatedAt: event.timestamp,
        },
        event.timestamp,
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
})
