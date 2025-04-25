import {
  BOOK_VALIDATION_RESULT,
  createErrorEvent,
  createMockEventBus,
  type EventBusPort,
  RESERVATION_BOOK_VALIDATION,
  RESERVATION_BOOK_VALIDATION_FAILED,
} from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { BookReadEventSubscriptions } from '@books/infrastructure/index.js'
import { BookReadProjectionHandler } from '@books/infrastructure/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules
vi.mock('@book-library-tool/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import mocked modules
import { logger } from '@book-library-tool/shared'

vi.mock('@book-library-tool/event-store', () => ({
  BOOK_VALIDATION_RESULT: 'BOOK_VALIDATION_RESULT',
  RESERVATION_BOOK_VALIDATION: 'RESERVATION_BOOK_VALIDATION',
  RESERVATION_BOOK_VALIDATION_FAILED: 'RESERVATION_BOOK_VALIDATION_FAILED',
  createErrorEvent: vi.fn(() => ({
    eventType: 'ErrorEvent',
    aggregateId: 'test-id',
    payload: {
      originalEventType: 'test-event',
      errorMessage: 'Test error message',
      errorType: 'test-error-type',
      reservationId: 'test-reservation-id',
      isbn: 'test-isbn',
    },
    timestamp: new Date(),
    version: 1,
    schemaVersion: 1,
  })),
}))

describe('BookReadEventSubscriptions', () => {
  // Create proper mocks with TypeScript-friendly types using MockedFunction
  type MockedFn<T extends (...args: any) => any> = T & {
    mockResolvedValue: (val: any) => MockedFn<T>
    mockRejectedValue: (val: any) => MockedFn<T>
    mockReturnValue: (val: any) => MockedFn<T>
    mock: { calls: any[][]; results: any[] }
  }

  // Create a properly typed mock for the event bus
  const mockEventBus: EventBusPort = createMockEventBus()

  const mockProjectionHandler = {
    handleValidateBook: vi
      .fn()
      .mockImplementation(() => Promise.resolve({} as DomainEvent)),
  } as unknown as BookReadProjectionHandler

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should subscribe to RESERVATION_BOOK_VALIDATION event type', () => {
    BookReadEventSubscriptions(mockEventBus, mockProjectionHandler)

    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(1)
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      RESERVATION_BOOK_VALIDATION,
      expect.any(Function),
    )
  })

  it('should handle RESERVATION_BOOK_VALIDATION events correctly', async () => {
    BookReadEventSubscriptions(mockEventBus, mockProjectionHandler)

    // Extract the handler function that was registered
    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const validationHandler = subscribeFunction.mock.calls.find(
      (call) => call[0] === RESERVATION_BOOK_VALIDATION,
    )?.[1]

    if (!validationHandler) {
      throw new Error('Handler not found')
    }

    const mockEvent: DomainEvent = {
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

    const validationResult: DomainEvent = {
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

    const mockedHandleValidateBook =
      mockProjectionHandler.handleValidateBook as MockedFn<
        typeof mockProjectionHandler.handleValidateBook
      >

    mockedHandleValidateBook.mockResolvedValue(validationResult)

    await validationHandler(mockEvent)

    expect(mockProjectionHandler.handleValidateBook).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(mockEventBus.publish).toHaveBeenCalledWith(validationResult)
    expect(logger.info).toHaveBeenCalled()
  })

  it('should handle errors in validation event handler correctly', async () => {
    BookReadEventSubscriptions(mockEventBus, mockProjectionHandler)

    // Extract the handler function that was registered
    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const validationHandler = subscribeFunction.mock.calls.find(
      (call) => call[0] === RESERVATION_BOOK_VALIDATION,
    )?.[1]

    if (!validationHandler) {
      throw new Error('Handler not found')
    }

    const mockEvent: DomainEvent = {
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

    vi.spyOn(mockProjectionHandler, 'handleValidateBook').mockRejectedValue(
      error,
    )

    await validationHandler(mockEvent)

    expect(logger.error).toHaveBeenCalledWith(
      `Error validating book for reservation: ${error}`,
    )
    expect(createErrorEvent).toHaveBeenCalledWith(
      mockEvent,
      error,
      RESERVATION_BOOK_VALIDATION_FAILED,
    )
    expect(mockEventBus.publish).toHaveBeenCalled()
  })

  it('should correctly set additional payload fields in error events', async () => {
    BookReadEventSubscriptions(mockEventBus, mockProjectionHandler)

    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const validationHandler = subscribeFunction.mock.calls.find(
      (call) => call[0] === RESERVATION_BOOK_VALIDATION,
    )?.[1]

    if (!validationHandler) {
      throw new Error('Handler not found')
    }

    const mockEvent: DomainEvent = {
      eventType: RESERVATION_BOOK_VALIDATION,
      aggregateId: 'reservation-123',
      payload: {
        reservationId: 'reservation-456',
        isbn: '978-3-16-148410-0',
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    const error = new Error('Validation error')

    vi.spyOn(mockProjectionHandler, 'handleValidateBook').mockRejectedValue(
      error,
    )

    // Mock implementation of createErrorEvent to capture parameters
    const mockErrorEvent = {
      eventType: RESERVATION_BOOK_VALIDATION_FAILED,
      aggregateId: 'reservation-123',
      payload: {
        originalEventType: RESERVATION_BOOK_VALIDATION,
        errorMessage: 'Validation error',
        errorType: 'Error',
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    ;(createErrorEvent as MockedFn<typeof createErrorEvent>).mockReturnValue(
      mockErrorEvent,
    )

    await validationHandler(mockEvent)

    // Get the actual error event that was published
    const publishFunction = mockEventBus.publish as MockedFn<
      typeof mockEventBus.publish
    >
    const publishedEvent = publishFunction.mock.calls[0][0]

    // Check that the additional fields were set
    expect(publishedEvent.payload.reservationId).toBe('reservation-456')
    expect(publishedEvent.payload.isbn).toBe('978-3-16-148410-0')
  })

  it('should log success message after setting up subscriptions', () => {
    BookReadEventSubscriptions(mockEventBus, mockProjectionHandler)

    expect(logger.info).toHaveBeenCalledWith(
      'Book event subscriptions configured successfully',
    )
  })
})
