import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Static, Type } from '@sinclair/typebox'

import {
  createFieldsSelectionSchema,
  createPaginationAndSortSchema,
} from './helper/helper.js'

// --------------------------------
// Common Schema Components
// --------------------------------

export const ALLOWED_RESERVATION_FIELDS = [
  'id',
  'userId',
  'bookId',
  'reservedAt',
  'dueDate',
  'status',
  'feeCharged',
  'retailPrice',
] as const

export type ReservationField = (typeof ALLOWED_RESERVATION_FIELDS)[number]

export const ALLOWED_RESERVATION_SORT_FIELDS = [
  'userId',
  'bookId',
  'reservedAt',
  'dueDate',
  'status',
  'feeCharged',
  'retailPrice',
  'returnedAt',
  'lateFee',
  'createdAt',
  'updatedAt',
  'deletedAt',
] as const

export type ReservationSortField =
  (typeof ALLOWED_RESERVATION_SORT_FIELDS)[number]

// --------------------------------
// Query Schemas
// --------------------------------

/**
 * Reservations History Query Schema (Used for request validation)
 * This schema validates pagination, sorting, and field selection parameters.
 */
export const ReservationsHistoryQuerySchema = Type.Object(
  {
    // Pagination and sort
    ...createPaginationAndSortSchema(ALLOWED_RESERVATION_SORT_FIELDS),
    // GraphQL fields selection
    fields: createFieldsSelectionSchema(ALLOWED_RESERVATION_FIELDS),
  },
  { additionalProperties: false },
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
    bookId: Type.String({
      format: 'uuid',
      minLength: 1,
      pattern: '^(?!\\s*$).+',
    }),
  },
  { $id: '#/components/schemas/ReservationRequest' },
)
export type ReservationRequest = Static<typeof ReservationRequestSchema>
export const ReservationRequestRef = Type.Ref(
  '#/components/schemas/ReservationRequest',
)

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * Reservation Schema
 */
export const ReservationSchema = Type.Object(
  {
    id: Type.Optional(
      Type.String({
        format: 'uuid',
        minLength: 1,
        pattern: '^(?!\\s*$).+',
      }),
    ),
    userId: Type.Optional(
      Type.String({
        format: 'uuid',
        minLength: 1,
        pattern: '^(?!\\s*$).+',
      }),
    ),
    bookId: Type.Optional(
      Type.String({
        format: 'uuid',
        minLength: 1,
        pattern: '^(?!\\s*$).+',
      }),
    ),
    reservedAt: Type.Optional(Type.String({ format: 'date-time' })),
    dueDate: Type.Optional(Type.String({ format: 'date-time' })),
    status: Type.Optional(
      Type.String({
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
    ),
    feeCharged: Type.Optional(Type.Number({ minimum: 0 })),
    retailPrice: Type.Optional(Type.Number({ minimum: 0 })),
    returnedAt: Type.Optional(Type.String({ format: 'date-time' })),
    lateFee: Type.Optional(Type.Number({ minimum: 0 })),
    payment: Type.Optional(
      Type.Object({
        received: Type.Boolean(),
        amount: Type.Number({ minimum: 0 }),
        date: Type.String({ format: 'date-time' }),
        method: Type.String(),
        reference: Type.String(),
        failReason: Type.String(),
      }),
    ),
    version: Type.Optional(Type.Number({ minimum: 0 })),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' })),
    deletedAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
  { $id: '#/components/schemas/Reservation' },
)
export type Reservation = Static<typeof ReservationSchema>
export const ReservationRef = Type.Ref('#/components/schemas/Reservation')

/**
 * Reservation Return response Schema
 */
export const ReservationReturnResponseSchema = Type.Object(
  {
    reservationId: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
    bookId: Type.String({ format: 'uuid' }),
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
