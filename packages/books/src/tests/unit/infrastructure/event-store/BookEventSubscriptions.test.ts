/**
 * @file BookEventSubscriptions.test.ts
 * @description Unit tests for the BookEventSubscriptions module.
 * This module handles the subscription and processing of book-related domain events.
 * It tests the integration between the event bus and book projection handler.
 */

import {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
  BOOK_VALIDATION_RESULT,
  createErrorEvent,
  DomainEvent,
  RESERVATION_BOOK_VALIDATION,
  RESERVATION_BOOK_VALIDATION_FAILED,
} from '@book-library-tool/event-store'
import { BookEventSubscriptions } from '@books/event-store/BookEventSubscriptions.js'
import { BookProjectionHandler } from '@books/event-store/BookProjectionHandler.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mock the logger module to prevent actual logging during tests.
 * This must be done before importing the logger.
 */
vi.mock('@book-library-tool/shared', () => {
  return {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
  }
})

// Import the mocked logger
import { logger } from '@book-library-tool/shared'

/**
 * Mock the event store module to provide test implementations of event types
 * and error event creation functionality.
 */
vi.mock('@book-library-tool/event-store', () => {
  return {
    BOOK_CREATED: 'BOOK_CREATED',
    BOOK_DELETED: 'BOOK_DELETED',
    BOOK_UPDATED: 'BOOK_UPDATED',
    BOOK_VALIDATION_RESULT: 'BOOK_VALIDATION_RESULT',
    RESERVATION_BOOK_VALIDATION: 'RESERVATION_BOOK_VALIDATION',
    RESERVATION_BOOK_VALIDATION_FAILED: 'RESERVATION_BOOK_VALIDATION_FAILED',
    createErrorEvent: vi.fn((event, error, type) => ({
      eventType: 'ErrorEvent',
      aggregateId: event.aggregateId,
      payload: {
        originalEventType: event.eventType,
        errorMessage: error.message,
        errorType: type,
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    })),
  }
})

/**
 * Test suite for BookEventSubscriptions
 *
 * This suite tests the following aspects:
 * 1. Event subscription setup
 * 2. Event handling for different event types
 * 3. Error handling and recovery
 * 4. Integration with the projection handler
 */
describe('BookEventSubscriptions', () => {
  /**
   * Mock implementation of the event bus interface.
   * Provides test implementations of all required methods.
   */
  const mockEventBus = {
    init: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    subscribeToAll: vi.fn(),
    unsubscribe: vi.fn().mockReturnValue(true),
    shutdown: vi.fn().mockResolvedValue(undefined),
    startConsuming: vi.fn().mockResolvedValue(undefined),
    bindEventTypes: vi.fn().mockResolvedValue(undefined),
    checkHealth: vi.fn().mockResolvedValue({ status: 'UP', details: {} }),
  }

  /**
   * Mock implementation of the book projection handler.
   * Provides test implementations of all event handling methods.
   */
  const mockProjectionHandler = {
    handleBookCreated: vi.fn().mockResolvedValue(undefined),
    handleBookUpdated: vi.fn().mockResolvedValue(undefined),
    handleBookDeleted: vi.fn().mockResolvedValue(undefined),
    handleReservationValidateBook: vi.fn(),
  }

  /**
   * Reset all mocks before each test to ensure clean state.
   */
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Tests that the subscription setup correctly registers handlers for all required event types.
   */
  it('should subscribe to all required event types', () => {
    // Act
    BookEventSubscriptions(
      mockEventBus,
      mockProjectionHandler as unknown as BookProjectionHandler,
    )

    // Assert
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(4)
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      BOOK_CREATED,
      expect.any(Function),
    )
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      BOOK_UPDATED,
      expect.any(Function),
    )
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      BOOK_DELETED,
      expect.any(Function),
    )
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      RESERVATION_BOOK_VALIDATION,
      expect.any(Function),
    )
  })

  /**
   * Tests the handling of BOOK_CREATED events.
   * Verifies that the correct handler is called with the event data.
   */
  it('should handle BOOK_CREATED events correctly', async () => {
    // Arrange
    BookEventSubscriptions(
      mockEventBus,
      mockProjectionHandler as unknown as BookProjectionHandler,
    )

    // Extract the handler function that was registered
    const createdHandler = mockEventBus.subscribe.mock.calls.find(
      (call) => call[0] === BOOK_CREATED,
    )?.[1]

    if (!createdHandler) {
      throw new Error('Handler not found')
    }

    const mockEvent: DomainEvent = {
      eventType: BOOK_CREATED,
      aggregateId: 'book-123',
      payload: {
        isbn: '123-456-789',
        title: 'Test Book',
        author: 'Test Author',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 29.99,
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    // Act
    await createdHandler(mockEvent)

    // Assert
    expect(mockProjectionHandler.handleBookCreated).toHaveBeenCalledWith(
      mockEvent,
    )
  })

  /**
   * Tests the handling of BOOK_UPDATED events.
   * Verifies that the correct handler is called with the event data.
   */
  it('should handle BOOK_UPDATED events correctly', async () => {
    // Arrange
    BookEventSubscriptions(
      mockEventBus,
      mockProjectionHandler as unknown as BookProjectionHandler,
    )

    // Extract the handler function that was registered
    const updatedHandler = mockEventBus.subscribe.mock.calls.find(
      (call) => call[0] === BOOK_UPDATED,
    )?.[1]

    if (!updatedHandler) {
      throw new Error('Handler not found')
    }

    const mockEvent: DomainEvent = {
      eventType: BOOK_UPDATED,
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
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      version: 2,
      schemaVersion: 1,
    }

    // Act
    await updatedHandler(mockEvent)

    // Assert
    expect(mockProjectionHandler.handleBookUpdated).toHaveBeenCalledWith(
      mockEvent,
    )
  })

  /**
   * Tests the handling of BOOK_DELETED events.
   * Verifies that the correct handler is called with the event data.
   */
  it('should handle BOOK_DELETED events correctly', async () => {
    // Arrange
    BookEventSubscriptions(
      mockEventBus,
      mockProjectionHandler as unknown as BookProjectionHandler,
    )

    // Extract the handler function that was registered
    const deletedHandler = mockEventBus.subscribe.mock.calls.find(
      (call) => call[0] === BOOK_DELETED,
    )?.[1]

    if (!deletedHandler) {
      throw new Error('Handler not found')
    }

    const mockEvent: DomainEvent = {
      eventType: BOOK_DELETED,
      aggregateId: 'book-123',
      payload: {
        deletedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      version: 3,
      schemaVersion: 1,
    }

    // Act
    await deletedHandler(mockEvent)

    // Assert
    expect(mockProjectionHandler.handleBookDeleted).toHaveBeenCalledWith(
      mockEvent,
    )
  })

  /**
   * Tests the handling of RESERVATION_BOOK_VALIDATION events.
   * Verifies that the validation handler is called and the result is published.
   */
  it('should handle RESERVATION_BOOK_VALIDATION events correctly', async () => {
    // Arrange
    BookEventSubscriptions(
      mockEventBus,
      mockProjectionHandler as unknown as BookProjectionHandler,
    )

    // Extract the handler function that was registered
    const validationHandler = mockEventBus.subscribe.mock.calls.find(
      (call) => call[0] === RESERVATION_BOOK_VALIDATION,
    )?.[1]

    if (!validationHandler) {
      throw new Error('Handler not found')
    }

    const mockValidationEvent: DomainEvent = {
      eventType: RESERVATION_BOOK_VALIDATION,
      aggregateId: 'reservation-123',
      payload: {
        reservationId: 'reservation-123',
        isbn: '123-456-789',
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    const mockValidationResultEvent: DomainEvent = {
      eventType: BOOK_VALIDATION_RESULT,
      aggregateId: '123-456-789',
      payload: {
        reservationId: 'reservation-123',
        isbn: '123-456-789',
        isValid: true,
        reason: null,
        retailPrice: 29.99,
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    mockProjectionHandler.handleReservationValidateBook.mockResolvedValue(
      mockValidationResultEvent,
    )

    // Act
    await validationHandler(mockValidationEvent)

    // Assert
    expect(
      mockProjectionHandler.handleReservationValidateBook,
    ).toHaveBeenCalledWith(mockValidationEvent)
    expect(mockEventBus.publish).toHaveBeenCalledWith(mockValidationResultEvent)
  })

  /**
   * Tests error handling for BOOK_CREATED events.
   * Verifies that errors are logged but don't crash the application.
   */
  it('should handle errors when handling BOOK_CREATED events', async () => {
    // Arrange
    BookEventSubscriptions(
      mockEventBus,
      mockProjectionHandler as unknown as BookProjectionHandler,
    )

    // Extract the handler function that was registered
    const createdHandler = mockEventBus.subscribe.mock.calls.find(
      (call) => call[0] === BOOK_CREATED,
    )?.[1]

    if (!createdHandler) {
      throw new Error('Handler not found')
    }

    const mockEvent: DomainEvent = {
      eventType: BOOK_CREATED,
      aggregateId: 'book-123',
      payload: {},
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    const error = new Error('Test error')

    mockProjectionHandler.handleBookCreated.mockRejectedValue(error)

    // Act
    await createdHandler(mockEvent)

    // Assert - should not throw but should log error
    expect(mockProjectionHandler.handleBookCreated).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(logger.error).toHaveBeenCalledWith(
      'Error handling BOOK_CREATED event: Error: Test error',
    )
  })

  /**
   * Tests error handling for RESERVATION_BOOK_VALIDATION events.
   * Verifies that validation errors result in error events being published.
   */
  it('should handle errors in RESERVATION_BOOK_VALIDATION by publishing an error event', async () => {
    // Arrange
    BookEventSubscriptions(
      mockEventBus,
      mockProjectionHandler as unknown as BookProjectionHandler,
    )

    // Extract the handler function that was registered
    const validationHandler = mockEventBus.subscribe.mock.calls.find(
      (call) => call[0] === RESERVATION_BOOK_VALIDATION,
    )?.[1]

    if (!validationHandler) {
      throw new Error('Handler not found')
    }

    const mockValidationEvent: DomainEvent = {
      eventType: RESERVATION_BOOK_VALIDATION,
      aggregateId: 'reservation-123',
      payload: {
        reservationId: 'reservation-123',
        isbn: '123-456-789',
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    const error = new Error('Validation error')

    mockProjectionHandler.handleReservationValidateBook.mockRejectedValue(error)

    // Act
    await validationHandler(mockValidationEvent)

    // Assert
    expect(createErrorEvent).toHaveBeenCalledWith(
      mockValidationEvent,
      error,
      RESERVATION_BOOK_VALIDATION_FAILED,
    )
    expect(mockEventBus.publish).toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      'Error validating book for reservation: Error: Validation error',
    )
  })
})
