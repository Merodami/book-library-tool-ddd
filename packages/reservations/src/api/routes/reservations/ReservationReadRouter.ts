import { schemas } from '@book-library-tool/api'
import { paginationHook } from '@book-library-tool/http'
import { GetReservationHistoryController } from '@reservations/api/controllers/reservations/index.js'
import { GetReservationHistoryHandler } from '@reservations/application/use_cases/queries/GetReservationHistoryHandler.js'
import type { FastifyInstance } from 'fastify'
import type { ReservationReadProjectionRepositoryPort } from 'src/domain/port/index.js'

/**
 * Router for reservation read operations (queries).
 * Defines endpoint to retrieve reservation history for a user.
 *
 * @param reservationReadProjectionRepository - Provides access to read-side projections of reservations.
 * @returns A Fastify plugin function registering read routes.
 */
export function createReservationReadRouter(
  reservationReadProjectionRepository: ReservationReadProjectionRepositoryPort,
) {
  return async function (app: FastifyInstance) {
    // Instantiate query handler and its controller
    const getHistoryHandler = new GetReservationHistoryHandler(
      reservationReadProjectionRepository,
    )
    const getReservationHistoryController = new GetReservationHistoryController(
      getHistoryHandler,
    )

    /**
     * GET /reservations/user/:userId
     * Retrieves paginated history of reservations for the specified user.
     */
    app.get<{
      Params: schemas.UserIdParameter
      Querystring: schemas.ReservationsHistoryQuery
    }>(
      '/user/:userId',
      {
        // Apply pagination middleware to parse page/limit params
        onRequest: [paginationHook],
        schema: {
          params: schemas.UserIdParameterSchema,
          querystring: schemas.ReservationsHistoryQuerySchema,
        },
      },
      async (request, reply) => {
        const result =
          await getReservationHistoryController.getReservationHistory(request)

        reply.code(200).send(result)
      },
    )
  }
}
