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

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Get HTTP status code for an error code
 */
export function getStatusCodeForError(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.BOOK_NOT_FOUND:
    case ErrorCode.RESERVATION_NOT_FOUND:
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

    case ErrorCode.INTERNAL_ERROR:
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
