import type { DomainEvent } from './domain/DomainEvent.js'
import type { EventBus } from './EventBus.js'
import { EventUpcaster } from './EventUpcaster.js' // You'd need to implement this

/**
 * Enhanced SimpleEventBus that supports event type filtering and versioning.
 * It allows subscribers to register handlers for specific event types.
 */
export class SimpleEventBus implements EventBus {
  // Map event types to their handlers
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> =
    new Map()

  // Optional: Event upcaster to handle schema versioning
  private eventUpcaster: EventUpcaster

  constructor(eventUpcaster?: EventUpcaster) {
    this.eventUpcaster = eventUpcaster || new EventUpcaster()
  }

  /**
   * Publishes the event to all subscribed handlers for this event type.
   * @param event - The domain event to publish.
   */
  async publish(event: DomainEvent): Promise<void> {
    // First upcast the event to ensure it's using the latest schema version
    const upcastedEvent = this.eventUpcaster.upcast(event)

    // Get handlers for this specific event type
    const eventTypeHandlers = this.handlers.get(upcastedEvent.eventType) || []

    // Also get handlers registered for all events
    const globalHandlers = this.handlers.get('*') || []

    // Combine specific and global handlers
    const allHandlers = [...eventTypeHandlers, ...globalHandlers]

    // Execute each handler with proper error handling
    for (const handler of allHandlers) {
      try {
        await handler(upcastedEvent)
      } catch (error) {
        console.error(
          `Error in event handler for ${upcastedEvent.eventType}:`,
          error,
        )
        // In production, consider more robust error handling:
        // - Dead letter queues
        // - Retry mechanisms
        // - Monitoring/alerting
      }
    }
  }

  /**
   * Subscribes a new event handler for a specific event type.
   * @param eventType - The type of event to handle, or '*' for all events
   * @param handler - Function to be invoked with the published event.
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void {
    // Initialize array for this event type if it doesn't exist
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }

    // Add the handler
    this.handlers.get(eventType)!.push(handler)
  }

  /**
   * Subscribes a handler to all events (convenience method)
   * @param handler - Function to be invoked with any published event.
   */
  subscribeToAll(handler: (event: DomainEvent) => Promise<void>): void {
    this.subscribe('*', handler)
  }

  /**
   * Unsubscribes a handler from a specific event type.
   * @param eventType - The type of event.
   * @param handler - The handler to remove.
   * @returns True if the handler was found and removed.
   */
  unsubscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): boolean {
    const handlers = this.handlers.get(eventType)
    if (!handlers) return false

    const index = handlers.indexOf(handler)
    if (index === -1) return false

    handlers.splice(index, 1)
    return true
  }
}
