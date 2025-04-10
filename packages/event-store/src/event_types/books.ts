/**
 * Domain event types for the Book aggregate.
 */
export const BOOK_CREATED = 'BookCreated'
export const BOOK_UPDATED = 'BookUpdated'
export const BOOK_DELETED = 'BookDeleted'

export const BOOK_VALIDATION_RESULT = 'BookValidationResult'
export const BOOK_VALIDATION_FAILED = 'BookValidationFailed'

/**
 * TypeScript type for the Book event types.
 */
export type BookEventType =
  | typeof BOOK_CREATED
  | typeof BOOK_UPDATED
  | typeof BOOK_DELETED
  | typeof BOOK_VALIDATION_RESULT
  | typeof BOOK_VALIDATION_FAILED
