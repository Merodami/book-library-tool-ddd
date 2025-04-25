import { schemas } from '@book-library-tool/api'
import { PaginatedResult } from '@book-library-tool/types'
import { DomainReservation } from '@reservations/domain/entities/DomainReservation.js'

/**
 * Interface for the reservation projection repository that handles read operations.
 * This is used for query operations that don't modify the system state.
 */
export interface ReservationReadProjectionRepositoryPort {
  /**
   * Get a user's reservations in pages (newest first).
   * @param query - Search and pagination parameters
   * @param fields - Optional fields to include in results
   * @returns Paginated response containing domain Reservation objects
   */
  getUserReservations(
    userId: string,
    query: schemas.ReservationsHistoryQuery,
    fields?: schemas.ReservationSortField[],
  ): Promise<PaginatedResult<DomainReservation>>

  /**
   * Find a reservation by ID, excluding soft-deleted.
   * @param id - Unique reservation identifier
   * @param fields - Optional fields to include in results
   * @returns Domain Reservation object or null if not found
   */
  getReservationById(
    id: string,
    fields?: schemas.ReservationSortField[],
  ): Promise<DomainReservation | null>

  /**
   * List all active reservations for a book.
   * @param bookId - Book ID
   * @param fields - Optional fields to include in results
   * @returns Array of domain Reservation objects
   */
  getActiveBookReservations(
    bookId: string,
    fields?: schemas.ReservationSortField[],
  ): Promise<DomainReservation[]>

  /**
   * Checks if any active reservation exists for a specific book
   * @param bookId - Book ID
   * @param userId - User identifier
   * @returns Boolean indicating whether any reservation exists
   */
  hasActiveReservations(bookId: string, userId: string): Promise<boolean>

  /**
   * Count active (non-deleted) reservations for a user.
   * @param userId - User identifier
   * @returns Count of active reservations
   */
  countActiveReservationsByUser(userId: string): Promise<number>
}
