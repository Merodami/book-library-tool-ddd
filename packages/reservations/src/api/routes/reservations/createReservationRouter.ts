import {
  schemas,
  validateBody,
  validateParams,
  validateQuery,
} from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { paginationMiddleware } from '@book-library-tool/sdk'
// Command (write) handlers:
import { CreateReservationHandler } from '@commands/CreateReservationHandler.js'
import { ReturnReservationHandler } from '@commands/ReturnReservationHandler.js'
import { ReservationController } from '@controllers/reservations/ReservationController.js'
// Unified facade and controller:
import { ReservationFacade } from '@controllers/reservations/ReservationFacade.js'
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
    eventBus,
  )
  const returnHandler = new ReturnReservationHandler(
    reservationRepository,
    eventBus,
  )

  // The query (read) handler uses the projection repository.
  const getHistoryHandler = new GetReservationHistoryHandler(
    reservationProjectionRepository,
  )

  // Create a unified facade combining all the handlers:
  const facade = new ReservationFacade(
    createHandler,
    returnHandler,
    getHistoryHandler,
  )

  // Create a single controller that delegates operations to the facade:
  const controller = new ReservationController(facade)

  // Routes configuration
  router.post(
    '/',
    validateBody(schemas.ReservationRequestSchema),
    controller.createReservation,
  )

  router.get(
    '/user/:userId',
    validateParams(schemas.UserIdSchema),
    validateQuery(schemas.ReservationsHistoryQuerySchema),
    paginationMiddleware(),
    controller.getReservationHistory,
  )

  router.patch(
    '/:reservationId/return',
    validateParams(schemas.ReservationReturnParamsSchema),
    controller.returnReservation,
  )

  return router
}
