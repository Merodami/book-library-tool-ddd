/**
 * Reservation status values used throughout the application.
 */
export enum RESERVATION_STATUS {
  // Reservation has been approved and paid
  RESERVED = 'reserved',
  BORROWED = 'borrowed',
  RETURNED = 'returned',
  LATE = 'late',
  BROUGHT = 'brought',
  CANCELLED = 'cancelled',

  // Reservation is in process
  CREATED = 'created',
  PENDING_PAYMENT = 'pending_payment',
  RESERVATION_BOOK_LIMIT_REACH = 'reservation_book_limit_reach',
  REJECTED = 'rejected',
}

/**
 * Metadata for paginated API responses.
 */
export type PaginationMetadata = {
  total: number
  page: number
  limit: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Generic type for wrapping paginated data with metadata.
 */
export type PaginatedResult<T> = {
  data: T[]
  pagination: PaginationMetadata
}

/**
 * Standard parameters for paginated API requests.
 */
export type PaginatedQuery = {
  page?: number
  limit?: number
}

/**
 * Read model representation of a book.
 */
export interface BookProjection {
  id: string // The aggregate ID
  isbn: string // Business identifier
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
  version: number
  updatedAt: Date
  deletedAt?: Date
}
