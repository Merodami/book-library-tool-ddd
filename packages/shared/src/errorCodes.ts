// @book-library-tool/shared/src/errors/errorCodes.ts

/**
 * Standardized error codes used across the application
 */
export enum ErrorCode {
  // Book-related errors
  BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
  BOOK_ALREADY_EXISTS = 'BOOK_ALREADY_EXISTS',
  BOOK_VALIDATION_FAILED = 'BOOK_VALIDATION_FAILED',
  BOOK_ALREADY_DELETED = 'BOOK_ALREADY_DELETED',
  BOOK_ALREADY_RETURNED = 'BOOK_ALREADY_RETURNED',
  BOOK_LOOKUP_FAILED = 'BOOK_LOOKUP_FAILED',

  // Reservation-related errors
  RESERVATION_INVALID_DATA = 'RESERVATION_INVALID_DATA',
  RESERVATION_NOT_FOUND = 'RESERVATION_NOT_FOUND',
  RESERVATION_ALREADY_EXISTS = 'RESERVATION_ALREADY_EXISTS',
  RESERVATION_CANNOT_BE_RETURNED = 'RESERVATION_CANNOT_BE_RETURNED',
  RESERVATION_CANNOT_BE_CANCELLED = 'RESERVATION_CANNOT_BE_CANCELLED',
  RESERVATION_CANNOT_BE_CONFIRMED = 'RESERVATION_CANNOT_BE_CONFIRMED',
  RESERVATION_CANNOT_BE_REJECTED = 'RESERVATION_CANNOT_BE_REJECTED',
  RESERVATION_INVALID_RETAIL_PRICE = 'RESERVATION_INVALID_RETAIL_PRICE',
  RESERVATION_INVALID_QUERY = 'RESERVATION_INVALID_QUERY',
  RESERVATION_DUPLICATE_RESERVATION = 'RESERVATION_DUPLICATE_RESERVATION',
  RESERVATION_INVALID_STATUS = 'RESERVATION_INVALID_STATUS',
  RESERVATION_RETRIEVAL_FAILED = 'RESERVATION_RETRIEVAL_FAILED',

  // Wallet-related errors
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  PAYMENT_PROCESSING_ERROR = 'PAYMENT_PROCESSING_ERROR',

  // User-related errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',

  // Health check-related errors
  HEALTH_CHECK_INVALID_DEPENDENCIES = 'HEALTH_CHECK_INVALID_DEPENDENCIES',
  HEALTH_CHECK_INVALID_DEPENDENCY = 'HEALTH_CHECK_INVALID_DEPENDENCY',
  HEALTH_CHECK_INVALID_SERVICES = 'HEALTH_CHECK_INVALID_SERVICES',
  HEALTH_CHECK_INVALID_STARTTIME = 'HEALTH_CHECK_INVALID_STARTTIME',
  HEALTH_CHECK_INVALID_VERSION = 'HEALTH_CHECK_INVALID_VERSION',
  HEALTH_CHECK_EXECUTION_FAILED = 'HEALTH_CHECK_EXECUTION_FAILED',
  HEALTH_CHECK_DEPENDENCIES_MISSING = 'HEALTH_CHECK_DEPENDENCIES_MISSING',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_AGGREGATE_ID = 'INVALID_AGGREGATE_ID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONCURRENCY_CONFLICT = 'CONCURRENCY_CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTITY = 'DUPLICATE_ENTITY',
  DUPLICATE_EVENT = 'DUPLICATE_EVENT',
  EVENT_SAVE_FAILED = 'EVENT_SAVE_FAILED',
  EVENT_LOOKUP_FAILED = 'EVENT_LOOKUP_FAILED',
  INVALID_QUERY = 'INVALID_QUERY',
  COMPLEXITY_LIMIT_EXCEEDED = 'COMPLEXITY_LIMIT_EXCEEDED',

  // Rate limit errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Not found errors
  URL_NOT_FOUND = 'URL_NOT_FOUND',
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
    case ErrorCode.URL_NOT_FOUND:
      return 404

    case ErrorCode.BOOK_ALREADY_EXISTS:
    case ErrorCode.RESERVATION_ALREADY_EXISTS:
    case ErrorCode.DUPLICATE_ENTITY:
    case ErrorCode.COMPLEXITY_LIMIT_EXCEEDED:
      return 409

    case ErrorCode.BOOK_VALIDATION_FAILED:
    case ErrorCode.RESERVATION_CANNOT_BE_RETURNED:
    case ErrorCode.RESERVATION_CANNOT_BE_CANCELLED:
    case ErrorCode.RESERVATION_CANNOT_BE_CONFIRMED:
    case ErrorCode.RESERVATION_CANNOT_BE_REJECTED:
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.BOOK_ALREADY_DELETED:
      return 400

    case ErrorCode.UNAUTHORIZED:
      return 401

    case ErrorCode.FORBIDDEN:
      return 403

    case ErrorCode.INTERNAL_ERROR:
    case ErrorCode.CONCURRENCY_CONFLICT:
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.PAYMENT_PROCESSING_ERROR:
    case ErrorCode.HEALTH_CHECK_INVALID_DEPENDENCIES:
    case ErrorCode.HEALTH_CHECK_INVALID_DEPENDENCY:
    case ErrorCode.HEALTH_CHECK_INVALID_SERVICES:
    case ErrorCode.HEALTH_CHECK_INVALID_STARTTIME:
    case ErrorCode.HEALTH_CHECK_INVALID_VERSION:
    case ErrorCode.HEALTH_CHECK_EXECUTION_FAILED:
    case ErrorCode.HEALTH_CHECK_DEPENDENCIES_MISSING:
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

    case ErrorCode.HEALTH_CHECK_INVALID_DEPENDENCIES:
      return 'Invalid health check dependencies configuration'

    case ErrorCode.HEALTH_CHECK_INVALID_DEPENDENCY:
      return 'Invalid health check dependency configuration'

    case ErrorCode.HEALTH_CHECK_INVALID_SERVICES:
      return 'Invalid service health results'

    case ErrorCode.HEALTH_CHECK_INVALID_STARTTIME:
      return 'Invalid service start time'

    case ErrorCode.HEALTH_CHECK_INVALID_VERSION:
      return 'Service version is required'

    case ErrorCode.HEALTH_CHECK_EXECUTION_FAILED:
      return 'Health check execution failed'

    case ErrorCode.HEALTH_CHECK_DEPENDENCIES_MISSING:
      return 'No health check dependencies configured'

    case ErrorCode.URL_NOT_FOUND:
      return 'The requested URL was not found'

    default:
      return 'An error occurred'
  }
}
