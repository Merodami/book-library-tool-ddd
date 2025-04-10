import { Reservation } from '@book-library-tool/sdk'
import {
  PaginatedQuery,
  PaginatedResult,
  RESERVATION_STATUS,
} from '@book-library-tool/types'

/**
 * Interface for the reservation projection repository that handles read operations.
 * This is used for query operations that don't modify the system state.
 */
export interface IReservationProjectionRepository {
  /**
   * Gets all reservations for a specific user.
   *
   * @param userId - The ID of the user
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
   * Gets all reservations for a specific book with optional filtering.
   *
   * @param isbn - The ISBN of the book
   * @param status - Optional status filter
   * @param userId - Optional user ID filter to find reservations for a specific book and user
   * @param pagination - Pagination options
   * @returns Paginated list of reservations
   */
  getBookReservations(
    isbn: string,
    userId?: string,
    status?: RESERVATION_STATUS,
    pagination?: PaginatedQuery,
  ): Promise<PaginatedResult<Reservation>>

  /**
   * Gets active reservations for a specific book.
   * This is useful for checking book availability.
   *
   * @param isbn - The ISBN of the book
   * @returns List of active reservations
   */
  getActiveBookReservations(isbn: string): Promise<Reservation[]>

  /**
   * Gets reservations filtered by status.
   * Useful for dashboard/analytics purposes.
   *
   * @param status - The reservation status to filter by
   * @param pagination - Pagination options
   * @returns Paginated list of reservations
   */
  getReservationsByStatus(
    status: RESERVATION_STATUS,
    pagination?: PaginatedQuery,
  ): Promise<PaginatedResult<Reservation>>
}
