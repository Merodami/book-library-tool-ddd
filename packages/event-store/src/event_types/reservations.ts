/**
 * Domain event types for the Reservation aggregate.
 */
export const RESERVATION_CREATED = 'ReservationCreated'
export const RESERVATION_UPDATED = 'ReservationUpdated'
export const RESERVATION_CANCELLED = 'ReservationCancelled'
export const RESERVATION_RETURNED = 'ReservationReturned'
export const RESERVATION_DELETED = 'ReservationDeleted'
export const RESERVATION_OVERDUE = 'ReservationOverdue'
export const RESERVATION_PENDING_PAYMENT = 'ReservationPendingPayment'
export const RESERVATION_CONFIRMED = 'ReservationConfirmed'
export const RESERVATION_REJECTED = 'ReservationRejected'
export const RESERVATION_BOOK_VALIDATION = 'ReservationValidateBook'
export const RESERVATION_BOOK_LIMIT_REACH = 'ReservationBookLimitReach'

/**
 * TypeScript type for the Reservation event types.
 */
export type ReservationEventType =
  | typeof RESERVATION_CREATED
  | typeof RESERVATION_UPDATED
  | typeof RESERVATION_CANCELLED
  | typeof RESERVATION_RETURNED
  | typeof RESERVATION_DELETED
  | typeof RESERVATION_OVERDUE
  | typeof RESERVATION_PENDING_PAYMENT
  | typeof RESERVATION_CONFIRMED
  | typeof RESERVATION_REJECTED
  | typeof RESERVATION_BOOK_VALIDATION
  | typeof RESERVATION_BOOK_LIMIT_REACH
