export interface ConfirmReservationCommand {
  reservationId: string
  paymentReference: string
  paymentMethod: string
  amount: number
  timestamp: Date
}
