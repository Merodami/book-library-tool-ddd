import { schemas, validateParams } from '@book-library-tool/api'
import { ReservationStatusController } from '@controllers/reservations/ReservationStatusController.js'
import { ReservationStatusFacade } from '@controllers/reservations/ReservationStatusFacade.js'
// Query (read) handlers:
import { GetReservationStatusHandler } from '@queries/GetReservationStatusHandler.js'
import type { IReservationProjectionRepository } from '@repositories/IReservationProjectionRepository.js'
import { Router } from 'express'

/**
 * Creates and configures a router for reservation status queries.
 * This router only handles read operations using the projection repository.
 *
 * @param reservationProjectionRepository - Repository for read operations (queries)
 * @returns Configured Express router
 */
export function createReservationStatusRouter(
  reservationProjectionRepository: IReservationProjectionRepository,
) {
  const router = Router()

  // Instantiate individual query handlers:
  const getStatusHandler = new GetReservationStatusHandler(
    reservationProjectionRepository,
  )

  // Create a unified facade combining the query handlers:
  const facade = new ReservationStatusFacade(getStatusHandler)

  // Create a controller that delegates operations to the facade:
  const controller = new ReservationStatusController(facade)

  // Routes configuration
  router.get(
    '/reservation/:reservationId',
    validateParams(schemas.ReservationReturnParamsSchema),
    controller.getReservationStatus,
  )

  return router
}
