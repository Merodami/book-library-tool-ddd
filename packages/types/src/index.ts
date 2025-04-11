export enum RESERVATION_STATUS {
  RESERVED = 'reserved',
  BORROWED = 'borrowed',
  RETURNED = 'returned',
  LATE = 'late',
  BOUGHT = 'bought',
  CANCELLED = 'cancelled',
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
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
