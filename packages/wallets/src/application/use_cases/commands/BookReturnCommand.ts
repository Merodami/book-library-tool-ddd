/**
 * Command for processing book returns and applying late fees.
 */
export interface BookReturnCommand {
  /** The ID of the user returning the book */
  userId: string
  /** The ID of the reservation being returned */
  reservationId: string
  /** The number of days the book is late */
  daysLate: number
  /** The retail price of the book for purchase calculation */
  retailPrice: number
}
