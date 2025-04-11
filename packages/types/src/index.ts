export enum RESERVATION_STATUS {
  // Reservation has been approved and paid
  RESERVED = 'reserved',
  BORROWED = 'borrowed',
  RETURNED = 'returned',
  LATE = 'late',
  BOUGHT = 'bought',
  CANCELLED = 'cancelled',

  // Reservation is in process
  CREATED = 'created',
  PENDING_PAYMENT = 'pending_payment',
  RESERVATION_BOOK_LIMIT_REACH = 'reservation_book_limit_reach',
  REJECTED = 'rejected',
}

export type PaginationMetadata = {
  total: number
  page: number
  limit: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

export type PaginatedResult<T> = {
  data: T[]
  pagination: PaginationMetadata
}

/**
 * Generic type for paginated query parameters
 */
export type PaginatedQuery = {
  page?: number
  limit?: number
}

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
