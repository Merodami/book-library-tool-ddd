import { schemas } from '@book-library-tool/api'
import { ErrorCode } from '@book-library-tool/shared'
import { logger } from '@book-library-tool/shared'
import { Errors } from '@book-library-tool/shared'
import { PaginatedResult } from '@book-library-tool/types'
import { DomainReservation } from '@reservations/domain/entities/DomainReservation.js'
import { ReservationReadProjectionRepositoryPort } from 'src/domain/port/index.js'

/**
 * Handles queries for a user's reservation history.
 * This is a query handler that performs read-only operations using the projection repository.
 */
export class GetReservationHistoryHandler {
  constructor(
    private readonly reservationReadProjectionRepository: ReservationReadProjectionRepositoryPort,
  ) {}

  /**
   * Retrieves a user's reservation history based on the provided query parameters.
   *
   * @param query - Contains userId and optional filters
   * @returns Paginated list of the user's reservations
   */
  async execute(
    userId: string,
    query: schemas.ReservationsHistoryQuery,
    fields?: schemas.ReservationSortField[],
  ): Promise<PaginatedResult<DomainReservation>> {
    try {
      // Retrieve all events for the given aggregate ID.
      const reservations =
        await this.reservationReadProjectionRepository.getUserReservations(
          userId,
          query,
          fields,
        )

      if (!reservations) {
        return {
          data: [],
          pagination: {
            total: 0,
            page: query.page || 1,
            limit: query.limit || 10,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
        }
      }

      return reservations
    } catch (err) {
      logger.error('Error retrieving reservations history:', err)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        'Error retrieving reservations history',
      )
    }
  }
}
