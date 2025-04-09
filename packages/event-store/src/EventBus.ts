import type { DomainEvent } from './domain/DomainEvent.js'

/**
 * EventBus provides an abstraction for publishing domain events.
 */
export interface EventBus {
  /**
   * Publishes the given event to all subscribers.
   * @param event - The domain event to be published.
   */
  publish(event: DomainEvent): Promise<void>

  /**
   * Registers a handler to be invoked when an event is published.
   * @param handler - A function that handles a domain event.
   */
  subscribe(handler: (event: DomainEvent) => Promise<void>): void
}
