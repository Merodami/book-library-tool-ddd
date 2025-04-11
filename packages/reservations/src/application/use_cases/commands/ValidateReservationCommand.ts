export interface ValidateReservationCommand {
  reservationId: string
  isValid: boolean
  reason?: string
  retailPrice?: number
}
