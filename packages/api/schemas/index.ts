import { Type, Static } from '@sinclair/typebox'
import { ReservationStatus } from '@book-library-tool/types'

// --------------------------------
// Common Schema Components
// --------------------------------

/**
 * Pagination Metadata Schema
 */
export const PaginationMetadataSchema = Type.Object(
  {
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    pages: Type.Number(),
    hasNext: Type.Boolean(),
    hasPrev: Type.Boolean(),
  },
  { $id: '#/components/schemas/PaginationMetadata' },
)

export type PaginationMetadata = Static<typeof PaginationMetadataSchema>
export const PaginationMetadataRef = Type.Ref(
  '#/components/schemas/PaginationMetadata',
)

// --------------------------------
// Query Schemas
// --------------------------------

/**
 * Catalog Search Query Schema (Used for the request validation)
 */
export const CatalogSearchQuerySchema = Type.Partial(
  Type.Object({
    title: Type.String(),
    author: Type.String(),
    publicationYear: Type.Number(),
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Number({
        minimum: 1,
        maximum: Number(process.env.PAGINATION_MAX_LIMIT) || 100,
        default: Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10,
      }),
    ),
  }),
  { $id: '#/components/schemas/CatalogSearchQuery' },
)
export type CatalogSearchQuery = Static<typeof CatalogSearchQuerySchema>
export const CatalogSearchQueryRef = Type.Ref(
  '#/components/schemas/CatalogSearchQuery',
)

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
 * User ID Schema
 */
export const UserIdSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
  },
  { $id: '#/components/schemas/UserId' },
)
export type UserId = Static<typeof UserIdSchema>
export const UserIdRef = Type.Ref('#/components/schemas/UserId')

/**
 * Book Reference ID Schema
 */
export const BookIdSchema = Type.Object(
  {
    referenceId: Type.String(),
  },
  { $id: '#/components/schemas/BookId' },
)
export type BookId = Static<typeof BookIdSchema>
export const BookIdRef = Type.Ref('#/components/schemas/BookId')

/**
 * Add Book Reference Request Schema
 */
export const BookRequestSchema = Type.Object(
  {
    id: Type.String(),
    title: Type.String(),
    author: Type.String(),
    publicationYear: Type.Number(),
    publisher: Type.String(),
    price: Type.Number(),
  },
  { $id: '#/components/schemas/BookRequest' },
)
export type BookRequest = Static<typeof BookRequestSchema>
export const BookRequestRef = Type.Ref('#/components/schemas/BookRequest')

/**
 * Reservation Request Schema
 */
export const ReservationRequestSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
    referenceId: Type.String(),
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

/**
 * Balance Wallet Request Schema
 */
export const WalletBalanceRequestSchema = Type.Object(
  {
    amount: Type.Number(),
  },
  { $id: '#/components/schemas/WalletBalanceRequest' },
)
export type WalletBalanceRequest = Static<typeof WalletBalanceRequestSchema>
export const WalletBalanceRequestRef = Type.Ref(
  '#/components/schemas/BalanceWalletRequest',
)

/**
 * Late Return Request Schema
 */
export const LateReturnRequestSchema = Type.Object(
  {
    daysLate: Type.Number({ minimum: 0 }),
    retailPrice: Type.Number({ minimum: 0 }),
  },
  { $id: '#/components/schemas/LateReturnRequest' },
)
export type LateReturnRequest = Static<typeof LateReturnRequestSchema>
export const LateReturnRequestRef = Type.Ref(
  '#/components/schemas/LateReturnRequest',
)

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * Book Schema
 */
export const BookSchema = Type.Object(
  {
    id: Type.String(),
    title: Type.String(),
    author: Type.String(),
    publicationYear: Type.Number(),
    publisher: Type.String(),
    price: Type.Number(),
  },
  { $id: '#/components/schemas/Book' },
)
export type Book = Static<typeof BookSchema>
export const BookRef = Type.Ref('#/components/schemas/Book')

/**
 * User Schema
 */
export const UserSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
    email: Type.String({ format: 'email' }),
    role: Type.String(),
  },
  { $id: '#/components/schemas/User' },
)
export type User = Static<typeof UserSchema>
export const UserRef = Type.Ref('#/components/schemas/User')

/**
 * Wallet Schema
 */
export const WalletSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
    balance: Type.Number(),
  },
  { $id: '#/components/schemas/Wallet' },
)
export type Wallet = Static<typeof WalletSchema>
export const WalletRef = Type.Ref('#/components/schemas/Wallet')

/**
 * Reservation Schema
 */
export const ReservationSchema = Type.Object(
  {
    reservationId: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
    referenceId: Type.String(),
    reservedAt: Type.String({ format: 'date-time' }),
    dueDate: Type.String({ format: 'date-time' }),
    status: Type.Unsafe<string>({
      type: 'string',
      enum: [
        ReservationStatus.RESERVED,
        ReservationStatus.BORROWED,
        ReservationStatus.RETURNED,
        ReservationStatus.LATE,
        ReservationStatus.BOUGHT,
      ],
    }),
    feeCharged: Type.Optional(Type.Number()),
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
    referenceId: Type.String(),
    reservedAt: Type.String({ format: 'date-time' }),
    dueDate: Type.String({ format: 'date-time' }),
    status: Type.Unsafe<string>({
      type: 'string',
      enum: [
        ReservationStatus.RESERVED,
        ReservationStatus.BORROWED,
        ReservationStatus.RETURNED,
        ReservationStatus.LATE,
        ReservationStatus.BOUGHT,
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

/**
 * Error Response Schema
 */
export const ErrorResponseSchema = Type.Object(
  {
    error: Type.String(),
    message: Type.Union([Type.String(), Type.Array(Type.String())]),
  },
  { $id: '#/components/schemas/ErrorResponse' },
)
export type ErrorResponse = Static<typeof ErrorResponseSchema>
export const ErrorResponseRef = Type.Ref('#/components/schemas/ErrorResponse')

// --------------------------------
// Paginated Response Schemas
// --------------------------------

/**
 * Paginated Book Response Schema
 */
export const PaginatedBookResponseSchema = Type.Object(
  {
    data: Type.Array(BookRef),
    pagination: PaginationMetadataSchema,
  },
  { $id: '#/components/schemas/PaginatedBookResponse' },
)
export type PaginatedBookResponse = Static<typeof PaginatedBookResponseSchema>
export const PaginatedBookResponseRef = Type.Ref(
  '#/components/schemas/PaginatedBookResponse',
)

/**
 * Paginated User Response Schema
 */
export const PaginatedUserResponseSchema = Type.Object(
  {
    data: Type.Array(UserRef),
    pagination: PaginationMetadataSchema,
  },
  { $id: '#/components/schemas/PaginatedUserResponse' },
)
export type PaginatedUserResponse = Static<typeof PaginatedUserResponseSchema>
export const PaginatedUserResponseRef = Type.Ref(
  '#/components/schemas/PaginatedUserResponse',
)

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

/**
 * Helper function to create paginated response schemas
 * Note: This helper is provided for future use but isn't necessary with the explicit definitions above
 */
export const createPaginatedResponse = <T extends Static<any>>(
  items: T[],
  page: number,
  limit: number,
  total: number,
) => {
  const pages = Math.ceil(total / limit)

  return {
    data: items,
    pagination: {
      total,
      page,
      limit,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  }
}
