/**
 * Command for processing payment events from the Wallet service.
 */
export interface PaymentCommand {
  /** The ID of the reservation being paid for */
  reservationId: string
  /** The ID of the user making the payment */
  userId: string
  /** The amount being paid */
  amount: number
  /** Whether the payment was successful */
  success: boolean
  /** Optional reason for payment failure */
  reason?: string
  /** Optional payment reference for successful payments */
  paymentReference?: string
  /** Optional payment method for successful payments */
  paymentMethod?: string
}
