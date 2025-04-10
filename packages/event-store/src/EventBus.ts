import type { DomainEvent } from './domain/DomainEvent.js'

/**
 * EventBus provides an abstraction for publishing domain events,
 * subscribing to specific event types, and handling initialization.
 */
export interface EventBus {
  /**
   * Initializes the event bus (e.g., creates connections or channels).
   * Must be called before using publish or subscribe.
   */
  init(): Promise<void>

  /**
   * Publishes the given event to all subscribers.
   * @param event - The domain event to be published.
   */
  publish(event: DomainEvent): Promise<void>

  /**
   * Registers a handler for a specific event type.
   * @param eventType - The type of event to handle, or '*' for all events.
   * @param handler - A function that handles a domain event.
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): void

  /**
   * Registers a handler for all event types.
   * @param handler - A function that handles any domain event.
   */
  subscribeToAll(handler: (event: DomainEvent) => Promise<void>): void

  /**
   * Unsubscribes a handler from a specific event type.
   * @param eventType - The type of event.
   * @param handler - The handler to remove.
   * @returns True if the handler was found and removed.
   */
  unsubscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): boolean

  /**
   * Optionally closes any underlying resources (e.g., connections).
   */
  shutdown?(): Promise<void>
}
