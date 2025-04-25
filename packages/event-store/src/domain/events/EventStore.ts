import { DomainEvent } from '@event-store/domain/index.js'

// This file defines the EventStore interface, which is responsible for appending and loading domain events.
export interface EventStore {
  /**
   * Appends a domain event to the event store.
   *
   * @param event - The domain event to append.
   * @returns A promise that resolves when the event has been appended.
   */
  append(event: DomainEvent): Promise<void>

  /**
   * Loads all domain events for a given aggregate ID.
   *
   * @param aggregateId - The ID of the aggregate whose events to load.
   * @returns A promise that resolves to an array of domain events.
   */
  load(aggregateId: string): Promise<DomainEvent[]>
}
