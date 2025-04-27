import type { DomainEvent } from '@book-library-tool/shared'
import type { Reservation } from '@reservations/domain/entities/Reservation.js'

/**
 * IReservationRepository abstracts the persistence and retrieval of domain events
 * for Reservation aggregates. It ensures optimistic concurrency via version checking.
 * Following CQRS principles, this repository focuses only on commands/writes.
 */
export interface ReservationReadRepositoryPort {
  /**
   * Retrieves all the domain events for a specific aggregate, ordered by version.
   *
   * @param aggregateId - The unique identifier of the Reservation aggregate.
   * @returns A promise that resolves to an array of DomainEvent objects.
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>

  /**
   * Gets a reservation by its ID for command operations.
   * This is used for loading the aggregate before modifying it.
   *
   * @param id - The ID of the reservation to retrieve
   * @returns The reservation if found, null otherwise
   */
  findById(id: string): Promise<Reservation | null>

  /**
   * Find active reservation by user and Book ID.
   * This is needed for validation during reservation creation.
   *
   * @param userId User identifier
   * @param bookId Book ID
   * @returns Active reservation or null
   */
  findActiveByUserAndBookId(
    userId: string,
    bookId: string,
  ): Promise<Reservation | null>
}
