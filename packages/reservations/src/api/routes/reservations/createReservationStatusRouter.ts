import { schemas, validateParams } from '@book-library-tool/api'
import { GetReservationStatusController } from '@controllers/reservations/GetReservationStatusController.js'
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

  // Instantiate the query handler directly:
  const getStatusHandler = new GetReservationStatusHandler(
    reservationProjectionRepository,
  )

  // Create the controller with the specific handler:
  const controller = new GetReservationStatusController(getStatusHandler)

  // Routes configuration
  router.get(
    '/reservation/:reservationId',
    validateParams(schemas.ReservationReturnParamsSchema),
    controller.getReservationStatus,
  )

  return router
}
