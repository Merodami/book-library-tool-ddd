import { schemas } from '@book-library-tool/api'
import type { EventBusPort } from '@book-library-tool/event-store'
import {
  CreateReservationController,
  ReturnReservationController,
} from '@reservations/api/controllers/reservations/index.js'
import { BookReturnHandler } from '@reservations/application/use_cases/commands/BookReturnHandler.js'
import { CreateReservationHandler } from '@reservations/application/use_cases/commands/CreateReservationHandler.js'
import type { FastifyInstance } from 'fastify'
import type {
  ReservationReadProjectionRepositoryPort,
  ReservationReadRepositoryPort,
  ReservationWriteRepositoryPort,
} from 'src/domain/port/index.js'

/**
 * Router for reservation write operations (commands).
 * Defines endpoints to create and return reservations.
 *
 * @param reservationReadRepository - Used to fetch existing reservations for return.
 * @param reservationWriteRepository - Used to persist new and updated reservations.
 * @param reservationReadProjectionRepository - Used to validate data consistency post-command.
 * @param eventBus - Publishes domain events after commands succeed.
 * @returns A Fastify plugin function registering write routes.
 */
export function createReservationWriteRouter(
  reservationReadRepository: ReservationReadRepositoryPort,
  reservationWriteRepository: ReservationWriteRepositoryPort,
  reservationReadProjectionRepository: ReservationReadProjectionRepositoryPort,
  eventBus: EventBusPort,
) {
  return async function (app: FastifyInstance) {
    // Instantiate command handlers
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

    // Wrap handlers in controllers for request handling
    const createReservationController = new CreateReservationController(
      createHandler,
    )
    const returnReservationController = new ReturnReservationController(
      returnHandler,
    )

    /**
     * POST /reservations
     * Creates a new reservation based on the request payload.
     */
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

    /**
     * PATCH /reservations/:id/return
     * Marks an existing reservation as returned.
     */
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
