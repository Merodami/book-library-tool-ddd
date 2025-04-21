/**
 * Command for validating a reservation.
 */
export interface ValidateReservationCommand {
  /** The ID of the reservation to validate */
  reservationId: string
  /** The ID of the book to validate */
  bookId: string
  /** Whether the reservation is valid */
  isValid: boolean
  /** Optional reason for validation failure */
  reason?: string
  /** Optional retail price of the book for payment processing */
  retailPrice?: number
}
