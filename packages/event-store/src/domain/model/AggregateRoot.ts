import type { DomainEvent } from '@event-store/events/DomainEvent.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * AggregateRoot provides a common foundation for all domain aggregates.
 * It automatically generates an internal UUID if one isn't supplied, tracks version,
 * and manages a collection of domain events raised during business operations.
 */
export abstract class AggregateRoot {
  public readonly id: string
  public version: number
  private _domainEvents: DomainEvent[] = []

  constructor(id?: string) {
    this.id = id ?? uuidv4()
    this.version = 0
  }

  /**
   * Adds a domain event to the aggregate's event collection.
   * Typically called from within the aggregate methods.
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  /**
   * Returns the list of domain events that have been raised by this aggregate.
   */
  public get domainEvents(): DomainEvent[] {
    return this._domainEvents
  }

  /**
   * Clears the aggregate's domain events.
   * Typically called after the events have been persisted and published.
   */
  public clearDomainEvents(): void {
    this._domainEvents = []
  }

  /**
   * Applies a domain event to update the aggregate's state.
   * Concrete aggregates must implement this to handle individual event types.
   * @param event - The event to be applied.
   */
  protected abstract applyEvent(event: DomainEvent): void

  /**
   * Rehydrates the aggregate from its event stream.
   * @param events - A list of DomainEvents to replay.
   * @returns The aggregate instance with its state rebuilt.
   */
  public rehydrate(events: DomainEvent[]): this {
    events.sort((a, b) => a.version - b.version)

    for (const event of events) {
      this.applyEvent(event)
      // Keep version up-to-date based on the event replay.
      this.version = event.version
    }

    return this
  }
}
