import { Reservation } from '@book-library-tool/sdk'
import { PaginatedQuery, PaginatedResult } from '@book-library-tool/types'

/**
 * Interface for the reservation projection repository that handles read operations.
 * This is used for query operations that don't modify the system state.
 */
export interface IReservationProjectionRepository {
  /**
   * Gets all reservations for a specific user.
   *
   * @param userId - The ID of the user
   * @param status - Optional status filter
   * @param pagination - Pagination options
   * @returns Paginated list of reservations
   */
  getUserReservations(
    userId: string,
    pagination?: PaginatedQuery,
  ): Promise<PaginatedResult<Reservation>>

  /**
   * Gets a specific reservation by its ID.
   *
   * @param reservationId - The ID of the reservation
   * @returns The reservation if found, null otherwise
   */
  getReservationById(reservationId: string): Promise<Reservation | null>

  /**
   * Gets all reservations for a specific book.
   *
   * @param isbn - The ISBN of the book
   * @param status - Optional status filter
   * @param dateRange - Optional date range filter
   * @param pagination - Pagination options
   * @returns Paginated list of reservations
   */
  getBookReservations(
    isbn: string,
    pagination?: PaginatedQuery,
  ): Promise<PaginatedResult<Reservation>>
}
