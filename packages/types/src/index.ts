export enum ReservationStatus {
  RESERVED = 'reserved',
  BORROWED = 'borrowed',
  RETURNED = 'returned',
  LATE = 'late',
  BOUGHT = 'bought',
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
