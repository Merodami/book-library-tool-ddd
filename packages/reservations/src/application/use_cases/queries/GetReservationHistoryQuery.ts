export type GetReservationHistoryQuery = {
  userId: string
  page: number
  limit: number
  sortBy?: string
  sortOrder?: string
}
