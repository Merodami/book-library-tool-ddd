/**
 * Domain event types for the Reservation aggregate.
 */
export const RESERVATION_CREATED = 'ReservationCreated'
export const RESERVATION_UPDATED = 'ReservationUpdated'
export const RESERVATION_RETURNED = 'ReservationReturned'
export const RESERVATION_DELETED = 'ReservationDeleted'
export const RESERVATION_STATUS_UPDATED = 'ReservationStatusUpdated'
export const RESERVATION_FEE_CHARGED = 'ReservationFeeCharged'
export const RESERVATION_UPDATE_LOGGED = 'ReservationUpdateLogged'
export const RESERVATION_FEE_PAID = 'ReservationFeePaid'
export const RESERVATION_FEE_REFUNDED = 'ReservationFeeRefunded'
export const RESERVATION_FEE_ADJUSTED = 'ReservationFeeAdjusted'
export const RESERVATION_DUE_DATE_EXTENDED = 'ReservationDueDateExtended'
export const RESERVATION_DUE_DATE_REMINDER_SENT =
  'ReservationDueDateReminderSent'
export const RESERVATION_STATUS_REMINDER_SENT = 'ReservationStatusReminderSent'

/**
 * TypeScript type for the Reservation event types.
 */
export type ReservationEventType =
  | typeof RESERVATION_CREATED
  | typeof RESERVATION_UPDATED
  | typeof RESERVATION_RETURNED
  | typeof RESERVATION_DELETED
  | typeof RESERVATION_STATUS_UPDATED
  | typeof RESERVATION_FEE_CHARGED
  | typeof RESERVATION_UPDATE_LOGGED
  | typeof RESERVATION_FEE_PAID
  | typeof RESERVATION_FEE_REFUNDED
  | typeof RESERVATION_FEE_ADJUSTED
  | typeof RESERVATION_DUE_DATE_EXTENDED
  | typeof RESERVATION_DUE_DATE_REMINDER_SENT
  | typeof RESERVATION_STATUS_REMINDER_SENT
