import { schemas } from '@book-library-tool/api'
import { Cache } from '@book-library-tool/redis/src/application/decorators/cache.js'
import type { ReservationsHistoryQuery } from '@book-library-tool/sdk'
import { GetReservationHistoryHandler } from '@reservations/queries/GetReservationHistoryHandler.js'
import type { FastifyReply, FastifyRequest } from 'fastify'

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
    prefix: 'reservation:history',
    condition: (result) => result && result.data && Array.isArray(result.data),
  })
  async getReservationHistory(
    request: FastifyRequest<{
      Params: Pick<schemas.UserDTO, 'userId'>
      Querystring: ReservationsHistoryQuery
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { userId } = request.params
    const { page, limit } = request.query

    // Call the handler directly to retrieve data from the projection repository
    const history = await this.getReservationHistoryHandler.execute({
      userId,
      page: page ? Math.floor(Number(page)) : 1,
      limit: limit ? Math.floor(Number(limit)) : 10,
    })

    await reply.status(200).send(history)
  }
}
