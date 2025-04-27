import type { DomainEvent } from '@shared/domain/index.js'

/**
 * IAggregateRoot defines the contract for domain aggregates.
 * It provides methods for tracking version, managing domain events,
 * and rehydrating state from an event stream.
 */
export interface AggregateRoot {
  /**
   * Unique identifier for the aggregate instance
   */
  readonly id: string

  /**
   * Current version of the aggregate, incremented with each state change
   */
  version: number

  /**
   * Returns the list of domain events that have been raised by this aggregate
   */
  get domainEvents(): DomainEvent[]

  /**
   * Clears the aggregate's domain events.
   * Typically called after the events have been persisted and published.
   */
  clearDomainEvents(): void

  /**
   * Rehydrates the aggregate from its event stream.
   * @param events - A list of DomainEvents to replay.
   * @returns The aggregate instance with its state rebuilt.
   */
  rehydrate(events: DomainEvent[]): this
}
