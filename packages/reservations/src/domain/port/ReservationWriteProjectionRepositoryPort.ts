import { DomainReservation } from '@reservations/domain/entities/DomainReservation.js'
/**
 * Interface for the reservation projection repository that handles read operations.
 * This is used for query operations that don't modify the system state.
 */
export interface ReservationWriteProjectionRepositoryPort {
  /**
   * Insert a new reservation with a generated _id.
   * @param res - Reservation DTO to save
   */
  saveReservationProjection(res: DomainReservation): Promise<void>

  /**
   * Partially update allowed fields on a reservation.
   * @param id - Reservation identifier
   * @param changes - Fields to update
   * @param updatedAt - Update timestamp
   */
  updateReservationProjection(
    id: string,
    changes: Partial<
      Pick<
        DomainReservation,
        'status' | 'feeCharged' | 'retailPrice' | 'reservedAt' | 'dueDate'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void>

  /**
   * Soft-delete a reservation for audit.
   * @param id - Reservation identifier
   * @param version - New version number
   * @param timestamp - Deletion timestamp
   */
  markReservationAsDeleted(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void>

  /**
   * Generic method to update reservation with version control
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   * @param version - New version number
   * @param eventType - Type of event for logging
   */
  updateReservationWithVersion(
    id: string,
    updates: Partial<DomainReservation>,
    version: number,
    eventType: string,
  ): Promise<void>

  /**
   * Updates a reservation when the book is brought back.
   * @param id - Reservation identifier
   * @param version - New version number
   * @param timestamp - Update timestamp
   */
  updateReservationBookBrought(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void>

  /**
   * Updates a reservation after failed payment.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   * @returns Object containing the matched count
   */
  updateReservationPaymentDeclined(
    id: string,
    updates: Partial<DomainReservation>,
  ): Promise<{ matchedCount: number }>

  /**
   * Updates a reservation based on book validation results.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   */
  updateReservationValidationResult(
    id: string,
    updates: Partial<DomainReservation>,
  ): Promise<void>

  /**
   * Updates a reservation's retail price.
   * @param id - Reservation identifier
   * @param retailPrice - New retail price
   * @param timestamp - Update timestamp
   */
  updateReservationRetailPrice(
    id: string,
    retailPrice: number,
    timestamp: Date,
  ): Promise<void>

  /**
   * Updates all reservations for a book when book details change.
   * @param bookId - Book ID
   * @param timestamp - Update timestamp
   */
  updateReservationsForBookUpdate(
    bookId: string,
    timestamp: Date,
  ): Promise<void>

  /**
   * Updates reservations when a book is deleted.
   * @param bookId - Book ID
   * @param timestamp - Update timestamp
   */
  markReservationsForDeletedBook(bookId: string, timestamp: Date): Promise<void>
}
