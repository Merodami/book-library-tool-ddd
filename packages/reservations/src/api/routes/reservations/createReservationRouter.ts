import {
  schemas,
  validateBody,
  validateParams,
  validateQuery,
} from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { paginationMiddleware } from '@book-library-tool/sdk'
import { BookReturnHandler } from '@commands/BookReturnHandler.js'
// Command (write) handlers:
import { CreateReservationHandler } from '@commands/CreateReservationHandler.js'
// Controllers for different operations:
import { CreateReservationController } from '@controllers/reservations/CreateReservationController.js'
import { GetReservationHistoryController } from '@controllers/reservations/GetReservationHistoryController.js'
import { ReturnReservationController } from '@controllers/reservations/ReturnReservationController.js'
// Query (read) handlers:
import { GetReservationHistoryHandler } from '@queries/GetReservationHistoryHandler.js'
import type { IReservationProjectionRepository } from '@repositories/IReservationProjectionRepository.js'
import type { IReservationRepository } from '@repositories/IReservationRepository.js'
import { Router } from 'express'

/**
 * Creates and configures a router for reservation-related operations.
 *
 * @param reservationRepository - Repository for write operations (commands)
 * @param reservationProjectionRepository - Repository for read operations (queries)
 * @param eventBus - Event bus for publishing domain events
 * @returns Configured Express router
 */
export function createReservationRouter(
  reservationRepository: IReservationRepository,
  reservationProjectionRepository: IReservationProjectionRepository,
  eventBus: EventBus,
) {
  const router = Router()

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
  router.post(
    '/',
    validateBody(schemas.ReservationRequestSchema),
    createReservationController.createReservation.bind(
      createReservationController,
    ),
  )

  router.get(
    '/user/:userId',
    validateParams(schemas.UserIdSchema),
    validateQuery(schemas.ReservationsHistoryQuerySchema),
    paginationMiddleware(),
    getReservationHistoryController.getReservationHistory.bind(
      getReservationHistoryController,
    ),
  )

  router.patch(
    '/:reservationId/return',
    validateParams(schemas.ReservationReturnParamsSchema),
    returnReservationController.returnReservation.bind(
      returnReservationController,
    ),
  )

  return router
}
