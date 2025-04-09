import type { DomainEvent } from './domain/DomainEvent.js'
import type { EventBus } from './EventBus.js'

/**
 * SimpleEventBus is a basic in-memory EventBus implementation.
 * It allows subscribers to register handlers to be notified when events are published.
 */
export class SimpleEventBus implements EventBus {
  private handlers: Array<(event: DomainEvent) => Promise<void>> = []

  /**
   * Publishes the event to all subscribed handlers.
   * Handlers are called sequentially; consider parallel or error-handling strategies as needed.
   * @param event - The domain event to publish.
   */
  async publish(event: DomainEvent): Promise<void> {
    // In a production system, consider wrapping each call with proper error handling.
    for (const handler of this.handlers) {
      await handler(event)
    }
  }

  /**
   * Subscribes a new event handler.
   * @param handler - Function to be invoked with the published event.
   */
  subscribe(handler: (event: DomainEvent) => Promise<void>): void {
    this.handlers.push(handler)
  }
}
