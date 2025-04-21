/**
 * Command for creating a new book reservation
 */
export type CreateReservationCommand = {
  /** The ID of the user making the reservation */
  userId: string
  /** The ID of the book to reserve */
  bookId: string
}
