import { Router } from 'express'
import {
  validateBody,
  validateParams,
  validateQuery,
} from '@book-library-tool/api'
import { schemas } from '@book-library-tool/api'
import { paginationMiddleware } from '@book-library-tool/sdk'
import { ReservationController } from '@controllers/reservationController.js'

export function createReservationRouter(
  reservationController: ReservationController,
) {
  const router = Router()

  router.post(
    '/',
    validateBody(schemas.ReservationRequestSchema),
    reservationController.createReservation,
  )

  router.get(
    '/user/:userId',
    validateParams(schemas.UserIdSchema),
    validateQuery(schemas.ReservationsHistoryQuerySchema),
    paginationMiddleware(),
    reservationController.getReservationHistory,
  )

  router.patch(
    '/:reservationId/return',
    validateParams(schemas.ReservationReturnParamsSchema),
    reservationController.returnReservation,
  )

  return router
}
