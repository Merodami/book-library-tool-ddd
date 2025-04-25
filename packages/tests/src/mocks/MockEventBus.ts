import type { DomainEvent, IEventBus } from '@book-library-tool/event-store'
import { vi } from 'vitest'

/**
 * Sample events for testing. Override per-test if needed.
 */
export const sampleEvents: DomainEvent[] = [
  {
    aggregateId: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
    eventType: 'BookCreated',
    version: 1,
    globalVersion: 1,
    timestamp: new Date(),
    schemaVersion: 1,
    payload: {
      id: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
      isbn: '978-3-16-148410-0',
      title: 'Book One',
      author: 'Author One',
    },
    metadata: {
      correlationId: 'corr-id-1',
      stored: new Date(),
    },
  },
  {
    aggregateId: '5a1018f2-3526-4275-a84b-784e4f2e5a11',
    eventType: 'BookUpdated',
    version: 2,
    globalVersion: 2,
    timestamp: new Date(),
    schemaVersion: 1,
    payload: {
      id: '5a1018f2-3526-4275-a84b-784e4f2e5a11',
      title: 'Book Two Updated',
    },
    metadata: {
      correlationId: 'corr-id-2',
      stored: new Date(),
    },
  },
]

/**
 * Creates an in-memory mock of the EventBus interface.
 * Useful for testing components that publish or subscribe to events
 * without requiring a real RabbitMQ connection.
 *
 * @returns A mock implementation of the EventBus interface
 */
export function createMockEventBus(): IEventBus {
  // Store published events for assertions in tests
  const publishedEvents: DomainEvent[] = []

  // Store subscriptions for tracking/assertions
  const handlers: Map<
    string,
    Array<(event: DomainEvent) => Promise<void>>
  > = new Map()

  // Track initialization state
  let initialized = false
  let consuming = false

  // Track bound event types
  const boundEventTypes: Set<string> = new Set()

  // Create the mock implementation
  const mockEventBus = {
    /**
     * Mocks initializing the event bus.
     * Sets the initialized flag to true.
     */
    init: vi.fn().mockImplementation(async () => {
      initialized = true

      return Promise.resolve()
    }),

    /**
     * Mocks publishing an event to the bus.
     * Stores events and delivers them to handlers if consuming is active.
     *
     * @param event - The domain event to publish
     * @throws Error if the bus hasn't been initialized
     */
    publish: vi.fn().mockImplementation(async (event: DomainEvent) => {
      if (!initialized) {
        throw new Error('EventBus not initialized')
      }

      publishedEvents.push({ ...event }) // Store a copy to prevent mutation

      // If consuming is active, deliver to handlers immediately
      if (consuming) {
        const eventType = event.eventType

        // Call specific handlers for this event type
        const specificHandlers = handlers.get(eventType) || []

        // Call handlers subscribed to all events
        const globalHandlers = handlers.get('*') || []

        // Execute all applicable handlers
        const allHandlers = [...specificHandlers, ...globalHandlers]

        for (const handler of allHandlers) {
          try {
            await handler(event)
          } catch (error) {
            console.error(`Error in event handler for ${eventType}:`, error)
          }
        }
      }

      return Promise.resolve()
    }),

    /**
     * Mocks subscribing to a specific event type.
     * Registers a handler for the given event type.
     *
     * @param eventType - The type of event to handle, or '*' for all events
     * @param handler - A function that handles the domain event
     */
    subscribe: vi
      .fn()
      .mockImplementation(
        (eventType: string, handler: (event: DomainEvent) => Promise<void>) => {
          if (!handlers.has(eventType)) {
            handlers.set(eventType, [])
          }

          handlers.get(eventType)!.push(handler)
        },
      ),

    /**
     * Mocks subscribing to all event types.
     * Registers a handler for the wildcard event type.
     *
     * @param handler - A function that handles any domain event
     */
    subscribeToAll: vi
      .fn()
      .mockImplementation((handler: (event: DomainEvent) => Promise<void>) => {
        if (!handlers.has('*')) {
          handlers.set('*', [])
        }

        handlers.get('*')!.push(handler)
      }),

    /**
     * Mocks unsubscribing a handler from a specific event type.
     *
     * @param eventType - The type of event
     * @param handler - The handler to remove
     * @returns True if the handler was found and removed, false otherwise
     */
    unsubscribe: vi
      .fn()
      .mockImplementation(
        (eventType: string, handler: (event: DomainEvent) => Promise<void>) => {
          const eventHandlers = handlers.get(eventType)

          if (!eventHandlers) {
            return false
          }

          const index = eventHandlers.indexOf(handler)

          if (index === -1) {
            return false
          }

          eventHandlers.splice(index, 1)

          return true
        },
      ),

    /**
     * Mocks shutting down the event bus.
     * Resets the internal state flags.
     */
    shutdown: vi.fn().mockImplementation(async () => {
      initialized = false
      consuming = false

      return Promise.resolve()
    }),

    /**
     * Mocks starting to consume messages from the queue.
     * Initializes if needed and sets the consuming flag.
     */
    startConsuming: vi.fn().mockImplementation(async () => {
      if (!initialized) {
        // Call the init function directly from our object
        await mockEventBus.init()
      }

      consuming = true

      // Process any events that were published before consumption started
      // but only if there are handlers to receive them
      if (handlers.size > 0) {
        const handledEvents = new Set<DomainEvent>()

        for (const event of publishedEvents) {
          const eventType = event.eventType
          const specificHandlers = handlers.get(eventType) || []
          const globalHandlers = handlers.get('*') || []

          if (specificHandlers.length > 0 || globalHandlers.length > 0) {
            const allHandlers = [...specificHandlers, ...globalHandlers]

            for (const handler of allHandlers) {
              try {
                await handler(event)
              } catch (error) {
                console.error(`Error in event handler for ${eventType}:`, error)
              }
            }

            handledEvents.add(event)
          }
        }
      }

      return Promise.resolve()
    }),

    /**
     * Mocks binding the queue to specific event types.
     * Stores the bound event types for later reference.
     *
     * @param eventTypes - Array of event types to bind
     */
    bindEventTypes: vi.fn().mockImplementation(async (eventTypes: string[]) => {
      if (!initialized) {
        await mockEventBus.init()
      }

      eventTypes.forEach((type) => boundEventTypes.add(type))

      return Promise.resolve()
    }),

    /**
     * Mocks checking the health of the event bus.
     * Returns a status object with mock metrics.
     *
     * @returns Health status information
     */
    checkHealth: vi.fn().mockImplementation(async () => {
      return Promise.resolve({
        status: initialized ? 'UP' : 'DOWN',
        details: {
          initialized,
          consuming,
          handlerCount: Array.from(handlers.values()).reduce(
            (total, handlers) => total + handlers.length,
            0,
          ),
          publishedEventCount: publishedEvents.length,
          boundEventTypes: Array.from(boundEventTypes),
        },
      })
    }),

    // Non-interface methods for testing
    /**
     * Access the stored published events (for testing purposes).
     *
     * @returns Array of published events
     */
    __getPublishedEvents: () => [...publishedEvents],
  }

  return mockEventBus
}

/**
 * Helper to access the published events from a mock event bus for assertions.
 *
 * @param mockEventBus The mock event bus instance
 * @returns Array of published events
 */
export function getPublishedEvents(mockEventBus: IEventBus): DomainEvent[] {
  // Access the stored events through the special mock property
  return (mockEventBus as any).__getPublishedEvents?.() || []
}

/**
 * Clears call history on all mock methods.
 * Call in your test's beforeEach() to isolate invocations.
 *
 * @param eventBus The mock event bus to reset
 */
export function resetMockEventBus(eventBus: IEventBus): void {
  for (const fn of [
    eventBus.init,
    eventBus.publish,
    eventBus.subscribe,
    eventBus.subscribeToAll,
    eventBus.unsubscribe,
    eventBus.shutdown,
    eventBus.startConsuming,
    eventBus.bindEventTypes,
    eventBus.checkHealth,
  ]) {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      vi.mocked(fn).mockClear()
    }
  }
}

/**
 * Convenience: an event bus mock with no initial events.
 *
 * @returns A fresh mock event bus with no events
 */
export function createEmptyMockEventBus(): IEventBus {
  const bus = createMockEventBus()

  return bus
}

/**
 * Convenience: an event bus mock whose methods always reject.
 * Useful for testing error handling paths.
 *
 * @param errorMessage Custom error message to use
 * @returns EventBus mock that rejects operations
 */
export function createErrorMockEventBus(
  errorMessage = 'Mock event bus error',
): IEventBus {
  const err = new Error(errorMessage)

  return {
    init: vi.fn().mockRejectedValue(err),
    publish: vi.fn().mockRejectedValue(err),
    subscribe: vi.fn(),
    subscribeToAll: vi.fn(),
    unsubscribe: vi.fn().mockReturnValue(false),
    shutdown: vi.fn().mockRejectedValue(err),
    startConsuming: vi.fn().mockRejectedValue(err),
    bindEventTypes: vi.fn().mockRejectedValue(err),
    checkHealth: vi.fn().mockResolvedValue({
      status: 'DOWN',
      details: { error: errorMessage },
    }),
  }
}

/**
 * Helper class to expose published events for testing.
 * Use this version if you need more detailed access to the mock's internals.
 */
export class TestableEventBus implements IEventBus {
  /**
   * Store of all published events
   */
  private publishedEvents: DomainEvent[] = []

  /**
   * Map of event type to array of handlers
   */
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> =
    new Map()

  /**
   * Whether the bus has been initialized
   */
  private initialized = false

  /**
   * Whether the bus is actively consuming messages
   */
  private consuming = false

  /**
   * Set of event types the bus is bound to
   */
  private boundEventTypes: Set<string> = new Set()

  /**
   * Mocks initializing the event bus.
   */
  init = vi.fn().mockImplementation(async () => {
    this.initialized = true

    return Promise.resolve()
  })

  /**
   * Mocks publishing an event to the bus.
   */
  publish = vi.fn().mockImplementation(async (event: DomainEvent) => {
    if (!this.initialized) {
      throw new Error('EventBus not initialized')
    }

    this.publishedEvents.push({ ...event })

    if (this.consuming) {
      const eventType = event.eventType
      const specificHandlers = this.handlers.get(eventType) || []
      const globalHandlers = this.handlers.get('*') || []
      const allHandlers = [...specificHandlers, ...globalHandlers]

      for (const handler of allHandlers) {
        try {
          await handler(event)
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error)
        }
      }
    }

    return Promise.resolve()
  })

  /**
   * Mocks subscribing to a specific event type.
   */
  subscribe = vi
    .fn()
    .mockImplementation(
      (eventType: string, handler: (event: DomainEvent) => Promise<void>) => {
        if (!this.handlers.has(eventType)) {
          this.handlers.set(eventType, [])
        }

        this.handlers.get(eventType)!.push(handler)
      },
    )

  /**
   * Mocks subscribing to all event types.
   */
  subscribeToAll = vi
    .fn()
    .mockImplementation((handler: (event: DomainEvent) => Promise<void>) => {
      this.subscribe('*', handler)
    })

  /**
   * Mocks unsubscribing a handler from a specific event type.
   */
  unsubscribe = vi
    .fn()
    .mockImplementation(
      (eventType: string, handler: (event: DomainEvent) => Promise<void>) => {
        const eventHandlers = this.handlers.get(eventType)

        if (!eventHandlers) {
          return false
        }

        const index = eventHandlers.indexOf(handler)

        if (index === -1) {
          return false
        }

        eventHandlers.splice(index, 1)

        return true
      },
    )

  /**
   * Mocks shutting down the event bus.
   */
  shutdown = vi.fn().mockImplementation(async () => {
    this.initialized = false
    this.consuming = false

    return Promise.resolve()
  })

  /**
   * Mocks starting to consume messages from the queue.
   */
  startConsuming = vi.fn().mockImplementation(async () => {
    if (!this.initialized) {
      await this.init()
    }

    this.consuming = true

    return Promise.resolve()
  })

  /**
   * Mocks binding the queue to specific event types.
   */
  bindEventTypes = vi.fn().mockImplementation(async (eventTypes: string[]) => {
    if (!this.initialized) {
      await this.init()
    }

    eventTypes.forEach((type) => this.boundEventTypes.add(type))

    return Promise.resolve()
  })

  /**
   * Mocks checking the health of the event bus.
   */
  checkHealth = vi.fn().mockImplementation(async () => {
    return Promise.resolve({
      status: this.initialized ? 'UP' : 'DOWN',
      details: {
        initialized: this.initialized,
        consuming: this.consuming,
        handlerCount: Array.from(this.handlers.values()).reduce(
          (total, handlers) => total + handlers.length,
          0,
        ),
        publishedEventCount: this.publishedEvents.length,
        boundEventTypes: Array.from(this.boundEventTypes),
      },
    })
  })

  /**
   * Gets the published events for assertions.
   *
   * @returns Copy of all published events
   */
  getPublishedEvents(): DomainEvent[] {
    return [...this.publishedEvents]
  }

  /**
   * Gets the registered handlers for assertions.
   *
   * @returns Copy of the handlers map
   */
  getHandlers(): Map<string, Array<(event: DomainEvent) => Promise<void>>> {
    return new Map(this.handlers)
  }

  /**
   * Gets the bound event types for assertions.
   *
   * @returns Array of bound event types
   */
  getBoundEventTypes(): string[] {
    return Array.from(this.boundEventTypes)
  }

  /**
   * Resets all internal state and mock call history.
   * Useful for test isolation.
   */
  reset(): void {
    this.publishedEvents = []
    this.handlers.clear()
    this.initialized = false
    this.consuming = false
    this.boundEventTypes.clear()

    resetMockEventBus(this)
  }
}
