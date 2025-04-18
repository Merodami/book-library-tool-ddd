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

  /**
   * Counts the number of active reservations for a specific user.
   * Active reservations are those with status RESERVED, CONFIRMED, or BORROWED.
   * Used to enforce business rules like maximum number of active reservations per user.
   *
   * @param userId - The ID of the user
   * @returns The count of active reservations
   */
  countActiveReservationsByUser(userId: string): Promise<number>

  /**
   * Creates a new reservation projection from a ReservationCreated event.
   *
   * @param reservationData - Data for the new reservation
   */
  saveReservation(reservationData: any): Promise<void>

  /**
   * Updates a reservation when it's returned.
   *
   * @param id - Reservation ID
   * @param updates - The updates to apply (status, returnedAt, lateFee)
   * @param version - The new version
   */
  updateReservationReturned(
    id: string,
    updates: any,
    version: number,
  ): Promise<void>

  /**
   * Updates a reservation when it's cancelled.
   *
   * @param id - Reservation ID
   * @param updates - The updates to apply (status, cancellation info)
   * @param version - The new version
   */
  updateReservationCancelled(
    id: string,
    updates: any,
    version: number,
  ): Promise<void>

  /**
   * Updates a reservation when it becomes overdue.
   *
   * @param id - Reservation ID
   * @param updates - The updates to apply (status, overdue info)
   * @param version - The new version
   */
  updateReservationOverdue(
    id: string,
    updates: any,
    version: number,
  ): Promise<void>

  /**
   * Marks a reservation as deleted.
   *
   * @param id - Reservation ID
   * @param version - The new version
   * @param timestamp - Timestamp of the deletion
   */
  markReservationAsDeleted(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void>

  /**
   * Updates all reservations for a book when book details change.
   *
   * @param isbn - The ISBN of the book
   * @param timestamp - Timestamp of the update
   */
  updateReservationsForBookUpdate(isbn: string, timestamp: Date): Promise<void>

  /**
   * Updates reservations when a book is deleted.
   *
   * @param isbn - The ISBN of the book
   * @param timestamp - Timestamp of the deletion
   */
  markReservationsForDeletedBook(isbn: string, timestamp: Date): Promise<void>

  /**
   * Updates a reservation based on book validation results.
   *
   * @param reservationId - Reservation ID
   * @param updates - The updates to apply
   */
  updateReservationValidationResult(
    reservationId: string,
    updates: any,
  ): Promise<void>

  /**
   * Updates a reservation after successful payment.
   *
   * @param id - Reservation ID
   * @param updates - The updates to apply (payment info)
   * @param version - The new version
   */
  updateReservationPaymentSuccess(
    id: string,
    updates: any,
    version: number,
  ): Promise<void>

  /**
   * Updates a reservation after failed payment.
   *
   * @param id - Reservation ID
   * @param updates - The updates to apply (payment failure info)
   * @returns The update result (including matchedCount for validation)
   */
  updateReservationPaymentDeclined(
    id: string,
    updates: any,
  ): Promise<{ matchedCount: number }>

  /**
   * Updates a reservation's retail price.
   *
   * @param id - Reservation ID
   * @param retailPrice - The new retail price
   * @param timestamp - Timestamp of the update
   */
  updateReservationRetailPrice(
    id: string,
    retailPrice: number,
    timestamp: Date,
  ): Promise<void>

  /**
   * Updates a reservation when the book is brought back.
   *
   * @param id - Reservation ID
   * @param version - The new version
   * @param timestamp - Timestamp of the update
   */
  updateReservationBookBrought(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void>
}
