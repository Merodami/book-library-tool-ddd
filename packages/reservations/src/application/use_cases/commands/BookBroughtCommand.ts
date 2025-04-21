/**
 * Command for processing a book purchase scenario, typically when late fees
 * have accumulated to the point of purchase.
 */
export interface BookBroughtCommand {
  /** The ID of the user making the purchase */
  userId: string
  /** The ID of the reservation being converted to a purchase */
  id: string
  /** The retail price of the book */
  retailPrice: number
  /** The total late fees accumulated */
  lateFees: number
}
