import type { DomainEvent } from '@book-library-tool/event-store'
import type { ReservationRequest } from '@book-library-tool/sdk'
import type { Reservation } from '@reservations/entities/Reservation.js'

/**
 * IReservationRepository abstracts the persistence and retrieval of domain events
 * for Reservation aggregates. It ensures optimistic concurrency via version checking.
 * Following CQRS principles, this repository focuses only on commands/writes.
 */
export interface IReservationRepository {
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
   * Creates a new reservation.
   *
   * @param reservationData - The data needed to create a reservation
   * @returns The created reservation
   */
  createReservation(reservationData: ReservationRequest): Promise<Reservation>

  /**
   * Marks a reservation as returned.
   *
   * @param reservationId - The ID of the reservation to return
   * @returns The updated reservation
   */
  returnReservation(reservationId: string): Promise<Reservation>

  /**
   * Cancels a reservation.
   *
   * @param reservationId - The ID of the reservation to cancel
   * @param reason - Optional reason for cancellation
   * @returns The updated reservation
   */
  cancelReservation(
    reservationId: string,
    reason?: string,
  ): Promise<Reservation>

  /**
   * Gets a reservation by its ID for command operations.
   * This is used for loading the aggregate before modifying it.
   *
   * @param reservationId - The ID of the reservation to retrieve
   * @returns The reservation if found, null otherwise
   */
  findById(reservationId: string): Promise<Reservation | null>

  /**
   * Find active reservation by user and ISBN.
   * This is needed for validation during reservation creation.
   *
   * @param userId User identifier
   * @param isbn Book ISBN
   * @returns Active reservation or null
   */
  findActiveByUserAndIsbn(
    userId: string,
    isbn: string,
  ): Promise<Reservation | null>
}
