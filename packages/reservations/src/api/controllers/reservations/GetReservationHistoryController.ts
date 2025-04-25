import { schemas } from '@book-library-tool/api'
import { ReservationSortFieldSchema } from '@book-library-tool/api/src/schemas/reservations.js'
import { ReservationSortField } from '@book-library-tool/api/src/schemas/reservations.js'
import { parseAndValidate } from '@book-library-tool/http'
import { Cache } from '@book-library-tool/redis'
import { httpRequestKeyGenerator } from '@book-library-tool/redis'
import { toApiReservation } from '@reservations/mappers/reservationMapper.js'
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
    keyGenerator: httpRequestKeyGenerator,
  })
  async getReservationHistory(
    request: FastifyRequest<{
      Params: schemas.UserIdParameter
      Querystring: schemas.ReservationsHistoryQuery
    }>,
  ): Promise<schemas.PaginatedResult<schemas.Reservation>> {
    const query = request.query as schemas.ReservationsHistoryQuery
    const { userId } = request.params

    let validFields: ReservationSortField[] | null = null

    if (query.fields && typeof query.fields === 'string') {
      const allowed = ReservationSortFieldSchema.enum as ReservationSortField[]

      validFields = parseAndValidate<ReservationSortField>(
        query.fields,
        allowed,
      )
    }

    const result = await this.getReservationHistoryHandler.execute(
      userId,
      query,
      validFields || undefined,
    )

    return {
      data: result.data.map(toApiReservation),
      pagination: result.pagination,
    }
  }
}
