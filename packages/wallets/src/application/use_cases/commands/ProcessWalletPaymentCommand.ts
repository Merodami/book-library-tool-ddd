/**
 * Command for processing a payment from a user's wallet for a reservation.
 */
export interface ProcessWalletPaymentCommand {
  /** The ID of the wallet making the payment */
  id: string
  /** The ID of the user making the payment */
  userId: string
  /** The ID of the reservation being paid for */
  reservationId: string
  /** Optional payment amount (defaults to reservation fee) */
  amount?: number
}
