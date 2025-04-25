import { schemas } from '@book-library-tool/api'
import type { EventBusPort } from '@book-library-tool/event-store'
import { paginationHook } from '@book-library-tool/http'
import {
  CreateReservationController,
  GetReservationHistoryController,
  ReturnReservationController,
} from '@reservations/api/controllers/reservations/index.js'
import { BookReturnHandler } from '@reservations/application/use_cases/commands/BookReturnHandler.js'
import { CreateReservationHandler } from '@reservations/application/use_cases/commands/CreateReservationHandler.js'
import { GetReservationHistoryHandler } from '@reservations/application/use_cases/queries/GetReservationHistoryHandler.js'
import { FastifyInstance, FastifyRequest } from 'fastify'
import {
  ReservationReadProjectionRepositoryPort,
  ReservationReadRepositoryPort,
  ReservationWriteRepositoryPort,
} from 'src/domain/port/index.js'

/**
 * Creates and configures routes for reservation-related operations.
 *
 * @param reservationRepository - Repository for write operations (commands)
 * @param reservationProjectionRepository - Repository for read operations (queries)
 * @param eventBus - Event bus for publishing domain events
 * @returns Fastify plugin function
 */
export function createReservationRouter(
  reservationReadRepository: ReservationReadRepositoryPort,
  reservationWriteRepository: ReservationWriteRepositoryPort,
  reservationReadProjectionRepository: ReservationReadProjectionRepositoryPort,
  eventBus: EventBusPort,
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
