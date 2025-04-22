/**
 * Domain event types for the Book aggregate.
 */
export const BOOK_CREATED = 'BOOK_CREATED'
export const BOOK_UPDATED = 'BOOK_UPDATED'
export const BOOK_DELETED = 'BOOK_DELETED'

export const BOOK_VALIDATION_RESULT = 'BOOK_VALIDATION_RESULT'
export const BOOK_VALIDATION_FAILED = 'BOOK_VALIDATION_FAILED'
export const BOOK_RETAIL_PRICE_UPDATED = 'BOOK_RETAIL_PRICE_UPDATED'
export const BOOK_CREATION_FAILED = 'BOOK_CREATION_FAILED'

/**
 * TypeScript type for the Book event types.
 */
export type BookEventType =
  | typeof BOOK_CREATED
  | typeof BOOK_UPDATED
  | typeof BOOK_DELETED
  | typeof BOOK_VALIDATION_RESULT
  | typeof BOOK_VALIDATION_FAILED
  | typeof BOOK_RETAIL_PRICE_UPDATED
  | typeof BOOK_CREATION_FAILED
