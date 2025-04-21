import { schemas } from '@book-library-tool/api'
import { parseAndValidate } from '@book-library-tool/http'
import { Cache } from '@book-library-tool/redis'
import { GetReservationHistoryHandler } from '@reservations/queries/GetReservationHistoryHandler.js'
import type { FastifyRequest } from 'fastify'

export class GetReservationHistoryController {
  constructor(
    private readonly getReservationHistoryHandler: GetReservationHistoryHandler,
  ) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.getReservationHistory = this.getReservationHistory.bind(this)
  }

  /**
   * GET /reservations/user/:userId
   * Retrieve a user's reservation history.
   * This uses the projection repository through the query handler.
   */
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'reservation',
    condition: (result) => result && result.data && Array.isArray(result.data),
  })
  async getReservationHistory(
    request: FastifyRequest<{
      Params: schemas.IdParameter
      Querystring: schemas.ReservationsHistoryQuery
    }>,
  ): Promise<schemas.PaginatedResult<schemas.ReservationDTO>> {
    const query = request.query as schemas.ReservationsHistoryQuery

    const validFields = parseAndValidate<schemas.ReservationSortField>(
      query.fields,
      schemas.ALLOWED_RESERVATION_SORT_FIELDS,
    )

    const result = await this.getReservationHistoryHandler.execute(
      query,
      validFields || undefined,
    )

    return result
  }
}
