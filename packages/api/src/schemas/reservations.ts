import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Static, Type } from '@sinclair/typebox'

import { PaginationMetadataSchema } from './shared.js'

// --------------------------------
// Common Schema Components
// --------------------------------

// --------------------------------
// Query Schemas
// --------------------------------

/**
 * Reservations History Query Schema (Used for request validation)
 * This schema only validates pagination parameters.
 */
export const ReservationsHistoryQuerySchema = Type.Partial(
  Type.Object({
    userId: Type.String({ format: 'uuid' }),
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Number({
        minimum: 1,
        maximum: Number(process.env.PAGINATION_MAX_LIMIT) || 100,
        default: Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10,
      }),
    ),
  }),
  { $id: '#/components/schemas/ReservationsHistoryQuery' },
)
export type ReservationsHistoryQuery = Static<
  typeof ReservationsHistoryQuerySchema
>
export const ReservationsHistoryQueryRef = Type.Ref(
  '#/components/schemas/ReservationsHistoryQuery',
)

// --------------------------------
// Request Schemas
// --------------------------------

/**
 * Reservation Request Schema
 */
export const ReservationRequestSchema = Type.Object(
  {
    userId: Type.String({
      format: 'uuid',
      minLength: 1,
      pattern: '^(?!\\s*$).+',
    }),
    isbn: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
  },
  { $id: '#/components/schemas/ReservationRequest' },
)
export type ReservationRequest = Static<typeof ReservationRequestSchema>
export const ReservationRequestRef = Type.Ref(
  '#/components/schemas/ReservationRequest',
)

/**
 * Reservation Return Params Schema
 */
export const ReservationReturnParamsSchema = Type.Object(
  {
    reservationId: Type.String({ format: 'uuid' }),
  },
  { $id: '#/components/schemas/ReservationReturnParams' },
)
export type ReservationReturnParams = Static<
  typeof ReservationReturnParamsSchema
>
export const ReservationReturnParamsRef = Type.Ref(
  '#/components/schemas/ReservationReturnParams',
)

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * Reservation Schema
 */
export const ReservationSchema = Type.Object(
  {
    reservationId: Type.String({
      format: 'uuid',
      minLength: 1,
      pattern: '^(?!\\s*$).+',
    }),
    userId: Type.String({
      format: 'uuid',
      minLength: 1,
      pattern: '^(?!\\s*$).+',
    }),
    isbn: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    reservedAt: Type.String({ format: 'date-time' }),
    dueDate: Type.String({ format: 'date-time' }),
    status: Type.String({
      enum: [
        RESERVATION_STATUS.CREATED,
        RESERVATION_STATUS.BORROWED,
        RESERVATION_STATUS.RETURNED,
        RESERVATION_STATUS.LATE,
        RESERVATION_STATUS.BROUGHT,
        RESERVATION_STATUS.CANCELLED,
        RESERVATION_STATUS.PENDING_PAYMENT,
        RESERVATION_STATUS.RESERVED,
        RESERVATION_STATUS.REJECTED,
        RESERVATION_STATUS.RESERVATION_BOOK_LIMIT_REACH,
      ],
    }),
    feeCharged: Type.Number({ minimum: 0 }),
    retailPrice: Type.Optional(Type.Number({ minimum: 0 })),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' })),
    deletedAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
  { $id: '#/components/schemas/Reservation' },
)
export type ReservationDTO = Static<typeof ReservationSchema>
export const ReservationRef = Type.Ref('#/components/schemas/Reservation')

/**
 * Reservation Return response Schema
 */
export const ReservationReturnResponseSchema = Type.Object(
  {
    reservationId: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
    isbn: Type.String(),
    reservedAt: Type.String({ format: 'date-time' }),
    dueDate: Type.String({ format: 'date-time' }),
    status: Type.Unsafe<string>({
      type: 'string',
      enum: [
        RESERVATION_STATUS.RESERVED,
        RESERVATION_STATUS.BORROWED,
        RESERVATION_STATUS.RETURNED,
        RESERVATION_STATUS.LATE,
        RESERVATION_STATUS.BROUGHT,
      ],
    }),
    feeCharged: Type.Optional(Type.Number()),
  },
  { $id: '#/components/schemas/Reservation' },
)
export type ReservationReturnResponse = Static<
  typeof ReservationReturnResponseSchema
>
export const ReservationReturnResponseRef = Type.Ref(
  '#/components/schemas/ReservationReturnResponse',
)

// --------------------------------
// Paginated Response Schemas
// --------------------------------

/**
 * Paginated Reservation Response Schema
 */
export const PaginatedReservationResponseSchema = Type.Object(
  {
    data: Type.Array(ReservationRef),
    pagination: PaginationMetadataSchema,
  },
  { $id: '#/components/schemas/PaginatedReservationResponse' },
)
export type PaginatedReservationResponse = Static<
  typeof PaginatedReservationResponseSchema
>
export const PaginatedReservationResponseRef = Type.Ref(
  '#/components/schemas/PaginatedReservationResponse',
)
