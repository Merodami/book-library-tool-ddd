import { PaginationQuery, Reservation } from '@book-library-tool/sdk'
import { PaginatedResult } from '@book-library-tool/types'
import type { IReservationProjectionRepository } from '@repositories/IReservationProjectionRepository.js'

/**
 * Handles queries for a user's reservation history.
 * This is a query handler that performs read-only operations using the projection repository.
 */
export class GetReservationHistoryHandler {
  constructor(
    private readonly reservationProjectionRepository: IReservationProjectionRepository,
  ) {}

  /**
   * Retrieves a user's reservation history based on the provided query parameters.
   *
   * @param query - Contains userId and optional filters
   * @returns Paginated list of the user's reservations
   */
  async execute(
    query: Pick<Reservation, 'userId'> & PaginationQuery,
  ): Promise<PaginatedResult<Reservation>> {
    // Extract the query parameters
    const { userId, page = 1, limit = 10 } = query

    // Query the projection repository to get the user's reservation history
    // The repository handles pagination and filtering
    const reservations =
      await this.reservationProjectionRepository.getUserReservations(userId, {
        page,
        limit,
      })

    return reservations
  }
}
