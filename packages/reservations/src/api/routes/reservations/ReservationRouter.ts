import { schemas } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { paginationHook } from '@book-library-tool/http'
import { BookReturnHandler } from '@reservations/commands/BookReturnHandler.js'
import { CreateReservationHandler } from '@reservations/commands/CreateReservationHandler.js'
import { CreateReservationController } from '@reservations/controllers/reservations/CreateReservationController.js'
import { GetReservationHistoryController } from '@reservations/controllers/reservations/GetReservationHistoryController.js'
import { ReturnReservationController } from '@reservations/controllers/reservations/ReturnReservationController.js'
import { GetReservationHistoryHandler } from '@reservations/queries/GetReservationHistoryHandler.js'
import type { IReservationReadProjectionRepository } from '@reservations/repositories/IReservationReadProjectionRepository.js'
import type { IReservationReadRepository } from '@reservations/repositories/IReservationReadRepository.js'
import type { IReservationWriteRepository } from '@reservations/repositories/IReservationWriteRepository.js'
import { FastifyInstance, FastifyRequest } from 'fastify'

/**
 * Creates and configures routes for reservation-related operations.
 *
 * @param reservationRepository - Repository for write operations (commands)
 * @param reservationProjectionRepository - Repository for read operations (queries)
 * @param eventBus - Event bus for publishing domain events
 * @returns Fastify plugin function
 */
export function createReservationRouter(
  reservationReadRepository: IReservationReadRepository,
  reservationWriteRepository: IReservationWriteRepository,
  reservationReadProjectionRepository: IReservationReadProjectionRepository,
  eventBus: EventBus,
) {
  return async function (app: FastifyInstance) {
    // Instantiate individual command handlers:
    const createHandler = new CreateReservationHandler(
      reservationWriteRepository,
      reservationReadProjectionRepository,
      eventBus,
    )
    const returnHandler = new BookReturnHandler(
      reservationReadRepository,
      reservationWriteRepository,
      eventBus,
    )

    // The query (read) handler uses the projection repository.
    const getHistoryHandler = new GetReservationHistoryHandler(
      reservationReadProjectionRepository,
    )

    // Create specialized controllers for each operation:
    const createReservationController = new CreateReservationController(
      createHandler,
    )
    const returnReservationController = new ReturnReservationController(
      returnHandler,
    )
    const getReservationHistoryController = new GetReservationHistoryController(
      getHistoryHandler,
    )

    // Routes configuration
    app.post<{
      Body: schemas.ReservationRequest
    }>(
      '/',
      {
        schema: {
          body: schemas.ReservationRequestSchema,
        },
      },
      async (
        request: FastifyRequest<{
          Body: schemas.ReservationRequest
        }>,
        reply,
      ) => {
        const result =
          await createReservationController.createReservation(request)

        reply.code(200).send(result)
      },
    )

    app.get<{
      Params: schemas.UserIdParameter
      Querystring: schemas.ReservationsHistoryQuery
    }>(
      '/user/:userId',
      {
        onRequest: [paginationHook],
        schema: {
          params: schemas.UserIdParameterSchema,
          querystring: schemas.ReservationsHistoryQuerySchema,
        },
      },
      async (
        request: FastifyRequest<{
          Params: schemas.UserIdParameter
          Querystring: schemas.ReservationsHistoryQuery
        }>,
        reply,
      ) => {
        const result =
          await getReservationHistoryController.getReservationHistory(request)

        reply.code(200).send(result)
      },
    )

    app.patch<{
      Params: schemas.IdParameter
    }>(
      '/:id/return',
      {
        schema: {
          params: schemas.IdParameterSchema,
        },
      },
      async (
        request: FastifyRequest<{
          Params: schemas.IdParameter
        }>,
        reply,
      ) => {
        const result =
          await returnReservationController.returnReservation(request)

        reply.code(200).send(result)
      },
    )
  }
}
