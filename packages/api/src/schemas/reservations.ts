import {
  ReservationFieldEnum,
  ReservationSortFieldEnum,
} from '@book-library-tool/sdk'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Static, Type } from '@sinclair/typebox'

import {
  createFieldsSelectionSchema,
  createPaginationSchema,
  createSortSchema,
} from './helper/helper.js'

// --------------------------------
// Common Schema Components
// --------------------------------

export const ReservationFieldSchema = Type.Enum(ReservationFieldEnum, {
  $id: '#/components/schemas/ReservationField',
})

export type ReservationField = Static<typeof ReservationFieldSchema>

export const ReservationSortFieldSchema = Type.Enum(ReservationSortFieldEnum, {
  $id: '#/components/schemas/ReservationSortField',
})

export type ReservationSortField = Static<typeof ReservationSortFieldSchema>

// --------------------------------
// Query Schemas
// --------------------------------

/**
 * Reservations History Query Schema (Used for request validation)
 * This schema validates pagination, sorting, and field selection parameters.
 */
export const ReservationsHistoryQuerySchema = Type.Object(
  {
    bookId: Type.Optional(Type.String({ minLength: 1 })),
    status: Type.Optional(Type.String({ minLength: 1 })),
    statusReason: Type.Optional(Type.String({ minLength: 1 })),
    paymentMethod: Type.Optional(Type.String({ minLength: 1 })),
    paymentReference: Type.Optional(Type.String({ minLength: 1 })),
    paymentFailReason: Type.Optional(Type.String({ minLength: 1 })),
    feeCharged: Type.Optional(Type.Number({ minimum: 0 })),
    feeChargedMin: Type.Optional(Type.Number({ minimum: 0 })),
    feeChargedMax: Type.Optional(Type.Number({ minimum: 0 })),
    retailPrice: Type.Optional(Type.Number({ minimum: 0 })),
    retailPriceMin: Type.Optional(Type.Number({ minimum: 0 })),
    retailPriceMax: Type.Optional(Type.Number({ minimum: 0 })),
    lateFee: Type.Optional(Type.Number({ minimum: 0 })),
    lateFeeMin: Type.Optional(Type.Number({ minimum: 0 })),
    lateFeeMax: Type.Optional(Type.Number({ minimum: 0 })),
    dueDate: Type.Optional(Type.String({ format: 'date-time' })),
    dueDateMin: Type.Optional(Type.String({ format: 'date-time' })),
    dueDateMax: Type.Optional(Type.String({ format: 'date-time' })),
    reservedAt: Type.Optional(Type.String({ format: 'date-time' })),
    reservedAtMin: Type.Optional(Type.String({ format: 'date-time' })),
    reservedAtMax: Type.Optional(Type.String({ format: 'date-time' })),
    returnedAt: Type.Optional(Type.String({ format: 'date-time' })),
    returnedAtMin: Type.Optional(Type.String({ format: 'date-time' })),
    returnedAtMax: Type.Optional(Type.String({ format: 'date-time' })),

    // Pagination and sort
    ...createPaginationSchema(),
    ...createSortSchema(ReservationSortFieldSchema),

    // GraphQL fields selection
    fields: createFieldsSelectionSchema(ReservationFieldSchema),
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
