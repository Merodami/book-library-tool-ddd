// @book-library-tool/shared/src/errors/errorCodes.ts

/**
 * Standardized error codes used across the application
 */
export enum ErrorCode {
  // Book-related errors
  BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
  BOOK_ALREADY_EXISTS = 'BOOK_ALREADY_EXISTS',
  BOOK_VALIDATION_FAILED = 'BOOK_VALIDATION_FAILED',

  // Reservation-related errors
  RESERVATION_INVALID_DATA = 'RESERVATION_INVALID_DATA',
  RESERVATION_NOT_FOUND = 'RESERVATION_NOT_FOUND',
  RESERVATION_ALREADY_EXISTS = 'RESERVATION_ALREADY_EXISTS',
  RESERVATION_CANNOT_BE_RETURNED = 'RESERVATION_CANNOT_BE_RETURNED',
  RESERVATION_CANNOT_BE_CANCELLED = 'RESERVATION_CANNOT_BE_CANCELLED',
  RESERVATION_CANNOT_BE_CONFIRMED = 'RESERVATION_CANNOT_BE_CONFIRMED',
  RESERVATION_CANNOT_BE_REJECTED = 'RESERVATION_CANNOT_BE_REJECTED',

  // Wallet-related errors
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  PAYMENT_PROCESSING_ERROR = 'PAYMENT_PROCESSING_ERROR',
  // User-related errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONCURRENCY_CONFLICT = 'CONCURRENCY_CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTITY = 'DUPLICATE_ENTITY',

  // Rate limit errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Get HTTP status code for an error code
 */
export function getStatusCodeForError(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.BOOK_NOT_FOUND:
    case ErrorCode.RESERVATION_NOT_FOUND:
    case ErrorCode.WALLET_NOT_FOUND:
    case ErrorCode.USER_NOT_FOUND:
      return 404

    case ErrorCode.BOOK_ALREADY_EXISTS:
    case ErrorCode.RESERVATION_ALREADY_EXISTS:
      return 409

    case ErrorCode.BOOK_VALIDATION_FAILED:
    case ErrorCode.RESERVATION_CANNOT_BE_RETURNED:
    case ErrorCode.RESERVATION_CANNOT_BE_CANCELLED:
    case ErrorCode.RESERVATION_CANNOT_BE_CONFIRMED:
    case ErrorCode.RESERVATION_CANNOT_BE_REJECTED:
    case ErrorCode.VALIDATION_ERROR:
      return 400

    case ErrorCode.UNAUTHORIZED:
      return 401

    case ErrorCode.FORBIDDEN:
      return 403

    case ErrorCode.DUPLICATE_ENTITY:
      return 409

    case ErrorCode.INTERNAL_ERROR:
    case ErrorCode.CONCURRENCY_CONFLICT:
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.PAYMENT_PROCESSING_ERROR:
      return 500
    default:
      return 500
  }
}

/**
 * Get default error message for an error code
 */
export function getDefaultMessageForError(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.BOOK_NOT_FOUND:
      return 'The requested book could not be found'

    case ErrorCode.BOOK_ALREADY_EXISTS:
      return 'A book with this ISBN already exists'

    case ErrorCode.BOOK_VALIDATION_FAILED:
      return 'Book validation failed'

    case ErrorCode.RESERVATION_NOT_FOUND:
      return 'The requested reservation could not be found'

    case ErrorCode.RESERVATION_ALREADY_EXISTS:
      return 'A reservation with these details already exists'

    case ErrorCode.RESERVATION_CANNOT_BE_RETURNED:
      return 'The reservation cannot be returned in its current state'

    case ErrorCode.RESERVATION_CANNOT_BE_CANCELLED:
      return 'The reservation cannot be cancelled in its current state'

    case ErrorCode.RESERVATION_CANNOT_BE_CONFIRMED:
      return 'The reservation cannot be confirmed in its current state'

    case ErrorCode.RESERVATION_CANNOT_BE_REJECTED:
      return 'The reservation cannot be rejected in its current state'

    case ErrorCode.WALLET_NOT_FOUND:
      return 'The requested wallet could not be found'

    case ErrorCode.PAYMENT_PROCESSING_ERROR:
      return 'An error occurred while processing the payment'

    case ErrorCode.VALIDATION_ERROR:
      return 'Validation error'

    case ErrorCode.UNAUTHORIZED:
      return 'Unauthorized access'

    case ErrorCode.FORBIDDEN:
      return 'Access forbidden'

    case ErrorCode.INTERNAL_ERROR:
      return 'An internal server error occurred'

    default:
      return 'An error occurred'
  }
}
