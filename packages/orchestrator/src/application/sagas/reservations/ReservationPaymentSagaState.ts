export enum ReservationPaymentSagaStatus {
  STARTED = 'STARTED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  RESERVATION_CONFIRMED = 'RESERVATION_CONFIRMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ReservationPaymentSagaState {
  id: string
  reservationId: string
  userId: string
  amount: number
  paymentReference?: string
  paymentMethod?: string
  status: ReservationPaymentSagaStatus
  error?: string
  startedAt: Date
  updatedAt: Date
  completedAt?: Date
}
