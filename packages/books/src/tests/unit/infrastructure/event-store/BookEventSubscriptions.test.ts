import {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
  BOOK_VALIDATION_RESULT,
  createErrorEvent,
  DomainEvent,
  EventBus,
  RESERVATION_BOOK_VALIDATION,
} from '@book-library-tool/event-store'
import { httpRequestKeyGenerator, RedisService } from '@book-library-tool/redis'
import { BookEventSubscriptions } from '@books/event-store/BookEventSubscriptions.js'
import { BookProjectionHandler } from '@books/event-store/BookProjectionHandler.js'
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

vi.mock('@book-library-tool/redis', () => ({
  httpRequestKeyGenerator: vi.fn(
    (namespace, method, args) =>
      `${namespace}:${method}:${args[0]?.params?.id || 'default'}`,
  ),
  RedisService: vi.fn(),
}))

vi.mock('@book-library-tool/event-store', () => ({
  BOOK_CREATED: 'BOOK_CREATED',
  BOOK_DELETED: 'BOOK_DELETED',
  BOOK_UPDATED: 'BOOK_UPDATED',
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

// Import mocked modules
import { logger } from '@book-library-tool/shared'

describe('BookEventSubscriptions', () => {
  // Create proper mocks with TypeScript-friendly types using MockedFunction
  type MockedFn<T extends (...args: any) => any> = T & {
    mockResolvedValue: (val: any) => MockedFn<T>
    mockRejectedValue: (val: any) => MockedFn<T>
    mockReturnValue: (val: any) => MockedFn<T>
    mock: { calls: any[][]; results: any[] }
  }

  // Create a properly typed mock for the event bus
  const mockEventBus = {
    init: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    subscribeToAll: vi.fn(),
    unsubscribe: vi.fn().mockReturnValue(true),
    unsubscribeFromAll: vi.fn(),
    getSubscribers: vi.fn(),
    getAllSubscribers: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
    startConsuming: vi.fn().mockResolvedValue(undefined),
    bindEventTypes: vi.fn().mockResolvedValue(undefined),
    checkHealth: vi.fn().mockResolvedValue({ status: 'UP', details: {} }),
  } as unknown as {
    [K in keyof EventBus]: MockedFn<EventBus[K]>
  }

  // Create a proper mock for the Redis service
  const mockCacheService = {
    // ICacheService methods
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    exists: vi.fn().mockResolvedValue(false),
    getTTL: vi.fn().mockResolvedValue(-2),
    updateTTL: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(true),
    checkHealth: vi.fn().mockResolvedValue({ status: 'healthy', details: {} }),

    // RedisService specific methods
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    delPattern: vi.fn().mockResolvedValue(1),
    clearAll: vi.fn().mockResolvedValue(undefined),
    listKeys: vi.fn().mockResolvedValue([]),
    setex: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
  } as unknown as RedisService

  const mockProjectionHandler = {
    handleBookCreated: vi.fn().mockResolvedValue(undefined),
    handleBookUpdated: vi.fn().mockResolvedValue(undefined),
    handleBookDeleted: vi.fn().mockResolvedValue(undefined),
    handleReservationValidateBook: vi.fn(),
    projectionRepository: {}, // Add the missing property
  } as unknown as BookProjectionHandler

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should subscribe to all required event types', () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

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

  it('should handle BOOK_CREATED events correctly', async () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

    // Extract the handler function that was registered
    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const createdHandler = subscribeFunction.mock.calls.find(
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

    await createdHandler(mockEvent)

    expect(mockProjectionHandler.handleBookCreated).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(mockCacheService.delPattern).toHaveBeenCalledWith(
      'catalog:getAllBooks*',
    )
  })

  it('should handle BOOK_UPDATED events correctly', async () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

    // Extract the handler function that was registered
    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const updatedHandler = subscribeFunction.mock.calls.find(
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

    await updatedHandler(mockEvent)

    expect(mockProjectionHandler.handleBookUpdated).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(httpRequestKeyGenerator).toHaveBeenCalledWith('book', 'getBook', [
      { params: { id: 'book-123' }, query: {} },
    ])
    expect(mockCacheService.del).toHaveBeenCalled()
    expect(mockCacheService.delPattern).toHaveBeenCalledWith(
      'catalog:getAllBooks*',
    )
  })

  it('should handle BOOK_DELETED events correctly', async () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

    // Extract the handler function that was registered
    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const deletedHandler = subscribeFunction.mock.calls.find(
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

    await deletedHandler(mockEvent)

    expect(mockProjectionHandler.handleBookDeleted).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(httpRequestKeyGenerator).toHaveBeenCalledWith('book', 'getBook', [
      { params: { id: 'book-123' }, query: {} },
    ])
    expect(mockCacheService.del).toHaveBeenCalled()
    expect(mockCacheService.delPattern).toHaveBeenCalledWith(
      'catalog:getAllBooks*',
    )
  })

  it('should clear cache even when BOOK_DELETED handler throws an error', async () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const deletedHandler = subscribeFunction.mock.calls.find(
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

    const error = new Error('Test error')
    const mockedHandleBookDeleted =
      mockProjectionHandler.handleBookDeleted as MockedFn<
        typeof mockProjectionHandler.handleBookDeleted
      >

    mockedHandleBookDeleted.mockRejectedValue(error)

    await deletedHandler(mockEvent)

    expect(mockProjectionHandler.handleBookDeleted).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(logger.error).toHaveBeenCalledWith(
      `Error handling BOOK_DELETED event: ${error}`,
    )

    // Cache should still be cleared in the finally block
    expect(mockCacheService.del).toHaveBeenCalled()
    expect(mockCacheService.delPattern).toHaveBeenCalledWith(
      'catalog:getAllBooks*',
    )
  })

  it('should handle RESERVATION_BOOK_VALIDATION events correctly', async () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

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

    const mockedHandleReservationValidateBook =
      mockProjectionHandler.handleReservationValidateBook as MockedFn<
        typeof mockProjectionHandler.handleReservationValidateBook
      >

    mockedHandleReservationValidateBook.mockResolvedValue(validationResult)

    await validationHandler(mockEvent)

    expect(
      mockProjectionHandler.handleReservationValidateBook,
    ).toHaveBeenCalledWith(mockEvent)
    expect(mockEventBus.publish).toHaveBeenCalledWith(validationResult)
    expect(logger.info).toHaveBeenCalled()
  })

  it('should handle errors in BOOK_CREATED event handlers correctly', async () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

    // Extract the handler function that was registered
    const subscribeFunction = mockEventBus.subscribe as MockedFn<
      typeof mockEventBus.subscribe
    >
    const createdHandler = subscribeFunction.mock.calls.find(
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

    const error = new Error('Test error')
    const mockedHandleBookCreated =
      mockProjectionHandler.handleBookCreated as MockedFn<
        typeof mockProjectionHandler.handleBookCreated
      >

    mockedHandleBookCreated.mockRejectedValue(error)

    await createdHandler(mockEvent)

    expect(logger.error).toHaveBeenCalledWith(
      `Error handling BOOK_CREATED event: ${error}`,
    )
    expect(createErrorEvent).toHaveBeenCalled()
    expect(mockEventBus.publish).toHaveBeenCalled()
  })

  it('should handle errors in validation event handler correctly', async () => {
    BookEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

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
    const mockedHandleReservationValidateBook =
      mockProjectionHandler.handleReservationValidateBook as MockedFn<
        typeof mockProjectionHandler.handleReservationValidateBook
      >

    mockedHandleReservationValidateBook.mockRejectedValue(error)

    await validationHandler(mockEvent)

    expect(logger.error).toHaveBeenCalledWith(
      `Error validating book for reservation: ${error}`,
    )
    expect(createErrorEvent).toHaveBeenCalled()
    expect(mockEventBus.publish).toHaveBeenCalled()
  })
})
