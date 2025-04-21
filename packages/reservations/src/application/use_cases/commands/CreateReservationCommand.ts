/**
 * Command for creating a new book reservation
 */
export type CreateReservationCommand = {
  /** The ID of the user making the reservation */
  userId: string
  /** The ISBN of the book to reserve */
  isbn: string
}
