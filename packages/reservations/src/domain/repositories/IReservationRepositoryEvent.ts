// Updated IReservationRepositoryEvent.ts

import type { DomainEvent } from '@book-library-tool/event-store'
import { Reservation } from '@entities/Reservation.js'

/**
 * IReservationRepositoryEvent abstracts the persistence and retrieval of domain events
 * for Reservation aggregates. It ensures optimistic concurrency via version checking.
 */
export interface IReservationRepositoryEvent {
  /**
   * Save a list of domain events for a given aggregate using a single operation.
   * An optimistic concurrency check on the expected version ensures that no
   * conflicting updates occur.
   *
   * @param aggregateId - The unique identifier of the Reservation aggregate.
   * @param events - The list of DomainEvent objects to be persisted.
   * @param expectedVersion - The version of the aggregate prior to appending these events.
   */
  saveEvents(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>

  /**
   * Append a batch of events atomically for the given aggregate.
   * This method enforces that the current version of the aggregate matches
   * the expected version before the events are appended.
   *
   * @param aggregateId - The unique identifier of the Reservation aggregate.
   * @param events - The batch of DomainEvent objects to be appended.
   * @param expectedVersion - The current version expected on the aggregate.
   */
  appendBatch(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>

  /**
   * Retrieves all the domain events for a specific aggregate, ordered by version.
   *
   * @param aggregateId - The unique identifier of the Reservation aggregate.
   * @returns A promise that resolves to an array of DomainEvent objects.
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>

  /**
   * Finds all reservations associated with a given userId.
   * This method queries the event store for events related to the userId
   * and rehydrates the Reservation aggregates from those events.
   *
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves to an array of Reservation aggregates.
   */
  findByUserId(userId: string): Promise<Reservation[]>

  /**
   * Finds an active reservation by userId and ISBN.
   * This method checks for reservations that are not returned, cancelled, or bought.
   *
   * @param userId - The user identifier.
   * @param isbn - The ISBN of the book.
   * @returns A Reservation object if found; otherwise, null.
   */
  findActiveByUserAndIsbn(
    userId: string,
    isbn: string,
  ): Promise<Reservation | null>
}
