import {
  BOOK_CREATED,
  BOOK_CREATION_FAILED,
  BOOK_DELETED,
  BOOK_UPDATED,
  createErrorEvent,
  createMockEventBus,
  DomainEvent,
  IEventBus,
} from '@book-library-tool/event-store'
import {
  createMockCacheService,
  httpRequestKeyGenerator,
  ICacheService,
  RedisService,
} from '@book-library-tool/redis'
import { BookWriteEventSubscriptions } from '@books/infrastructure/index.js'
import { BookWriteProjectionHandler } from '@books/infrastructure/index.js'
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
  BOOK_CREATION_FAILED: 'BOOK_CREATION_FAILED',
  BOOK_DELETED: 'BOOK_DELETED',
  BOOK_UPDATED: 'BOOK_UPDATED',
  createErrorEvent: vi.fn(() => ({
    eventType: 'ErrorEvent',
    aggregateId: 'test-id',
    payload: {
      originalEventType: 'test-event',
      errorMessage: 'Test error message',
      errorType: 'test-error-type',
    },
    timestamp: new Date(),
    version: 1,
    schemaVersion: 1,
  })),
}))

// Import mocked modules
import { logger } from '@book-library-tool/shared'

describe('BookWriteEventSubscriptions', () => {
  // Create proper mocks with TypeScript-friendly types using MockedFunction
  type MockedFn<T extends (...args: any) => any> = T & {
    mockResolvedValue: (val: any) => MockedFn<T>
    mockRejectedValue: (val: any) => MockedFn<T>
    mockReturnValue: (val: any) => MockedFn<T>
    mock: { calls: any[][]; results: any[] }
  }

  // Create a properly typed mock for the event bus
  let mockEventBus: IEventBus

  // Create a mock for the Redis service
  const mockCacheService: ICacheService = createMockCacheService()

  // Create a mock for the projection handler
  const mockProjectionHandler = {
    handleBookCreated: vi.fn().mockResolvedValue(undefined),
    handleBookUpdated: vi.fn().mockResolvedValue(undefined),
    handleBookDeleted: vi.fn().mockResolvedValue(undefined),
  } as unknown as BookWriteProjectionHandler

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should subscribe to all required event types', () => {
    BookWriteEventSubscriptions(
      (mockEventBus = createMockEventBus()),
      mockCacheService as RedisService,
      mockProjectionHandler,
    )

    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3)
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
  })

  it('should handle BOOK_CREATED events correctly', async () => {
    BookWriteEventSubscriptions(
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
        id: 'book-123',
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

  it('should handle errors in BOOK_CREATED event handlers', async () => {
    BookWriteEventSubscriptions(
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
        id: 'book-123',
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

    vi.spyOn(mockProjectionHandler, 'handleBookCreated').mockRejectedValueOnce(
      error,
    )

    await createdHandler(mockEvent)

    expect(mockProjectionHandler.handleBookCreated).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(logger.error).toHaveBeenCalledWith(
      `Error handling BOOK_CREATED event: ${error}`,
    )
    expect(createErrorEvent).toHaveBeenCalledWith(
      mockEvent,
      error,
      BOOK_CREATION_FAILED,
    )
    expect(mockEventBus.publish).toHaveBeenCalled()
  })

  it('should handle BOOK_UPDATED events correctly', async () => {
    BookWriteEventSubscriptions(
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
        updated: {
          title: 'Updated Title',
          author: 'Updated Author',
        },
        previous: {
          title: 'Original Title',
          author: 'Original Author',
        },
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

  it('should handle errors in BOOK_UPDATED event handlers', async () => {
    BookWriteEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

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
        updated: {
          title: 'Updated Title',
          author: 'Updated Author',
        },
        previous: {
          title: 'Original Title',
          author: 'Original Author',
        },
      },
      timestamp: new Date(),
      version: 2,
      schemaVersion: 1,
    }

    const error = new Error('Test error')

    vi.spyOn(mockProjectionHandler, 'handleBookUpdated').mockRejectedValueOnce(
      error,
    )

    await updatedHandler(mockEvent)

    expect(mockProjectionHandler.handleBookUpdated).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(logger.error).toHaveBeenCalledWith(
      `Error handling BOOK_UPDATED event: ${error}`,
    )

    // No error event is created for BOOK_UPDATED events
    expect(createErrorEvent).not.toHaveBeenCalled()
    expect(mockEventBus.publish).not.toHaveBeenCalled()
  })

  it('should handle BOOK_DELETED events correctly', async () => {
    BookWriteEventSubscriptions(
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

  it('should still clear cache when BOOK_DELETED handler throws an error', async () => {
    BookWriteEventSubscriptions(
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

    vi.spyOn(mockProjectionHandler, 'handleBookDeleted').mockRejectedValueOnce(
      error,
    )

    await deletedHandler(mockEvent)

    expect(mockProjectionHandler.handleBookDeleted).toHaveBeenCalledWith(
      mockEvent,
    )
    expect(logger.error).toHaveBeenCalledWith(
      `Error handling BOOK_DELETED event: ${error}`,
    )

    // Cache clearing should still happen in the finally block
    expect(mockCacheService.del).toHaveBeenCalled()
    expect(mockCacheService.delPattern).toHaveBeenCalledWith(
      'catalog:getAllBooks*',
    )
  })

  it('should log a success message after configuring subscriptions', () => {
    BookWriteEventSubscriptions(
      mockEventBus,
      mockCacheService,
      mockProjectionHandler,
    )

    expect(logger.info).toHaveBeenCalledWith(
      'Book event subscriptions configured successfully',
    )
  })
})
