export type {
  BookRequest,
  BalanceWalletRequest,
  Book,
  BookId,
  CatalogSearchQuery,
  ErrorResponse,
  Reservation,
  ReservationRequest,
  Wallet,
  User,
  UserId,
} from './openapi/index.js'

/**
 * An error message returned by the API.
 *
 * Such errors will have a `body` property. Generally, you cannot assume
 * that this property exists, as you may be catching a different error,
 * so we mark it as optional.
 */
export type MaybeAPIError = Error & {
  body?: {
    message: string
    data?: {
      code?: string
      statusCode?: string
      message?: string
    }
  }
}
