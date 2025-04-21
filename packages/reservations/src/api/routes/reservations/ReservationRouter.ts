import { schemas } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { paginationHook } from '@book-library-tool/http'
import { BookReturnHandler } from '@reservations/commands/BookReturnHandler.js'
// Command (write) handlers:
import { CreateReservationHandler } from '@reservations/commands/CreateReservationHandler.js'
// Controllers for different operations:
import { CreateReservationController } from '@reservations/controllers/reservations/CreateReservationController.js'
import { GetReservationHistoryController } from '@reservations/controllers/reservations/GetReservationHistoryController.js'
import { ReturnReservationController } from '@reservations/controllers/reservations/ReturnReservationController.js'
// Query (read) handlers:
import { GetReservationHistoryHandler } from '@reservations/queries/GetReservationHistoryHandler.js'
import type { IReservationProjectionRepository } from '@reservations/repositories/IReservationProjectionRepository.js'
import type { IReservationRepository } from '@reservations/repositories/IReservationRepository.js'
// Import type definitions that match your schemas
import { FastifyInstance } from 'fastify'

/**
 * Creates and configures routes for reservation-related operations.
 *
 * @param reservationRepository - Repository for write operations (commands)
 * @param reservationProjectionRepository - Repository for read operations (queries)
 * @param eventBus - Event bus for publishing domain events
 * @returns Fastify plugin function
 */
export function createReservationRouter(
  reservationRepository: IReservationRepository,
  reservationProjectionRepository: IReservationProjectionRepository,
  eventBus: EventBus,
) {
  return async function (app: FastifyInstance) {
    // Instantiate individual command handlers:
    const createHandler = new CreateReservationHandler(
      reservationRepository,
      reservationProjectionRepository,
      eventBus,
    )
    const returnHandler = new BookReturnHandler(reservationRepository, eventBus)

    // The query (read) handler uses the projection repository.
    const getHistoryHandler = new GetReservationHistoryHandler(
      reservationProjectionRepository,
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
      async (request, reply) => {
        const result =
          await createReservationController.createReservation(request)

        reply.code(200).send(result)
      },
    )

    app.get<{
      Params: schemas.IdParameter
      Querystring: schemas.ReservationsHistoryQuery
    }>(
      '/user/:userId',
      {
        onRequest: [paginationHook],
        schema: {
          params: schemas.IdParameterSchema,
          querystring: schemas.ReservationsHistoryQuerySchema,
        },
      },
      async (request, reply) => {
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
      async (request, reply) => {
        const result =
          await returnReservationController.returnReservation(request)

        reply.code(200).send(result)
      },
    )
  }
}
