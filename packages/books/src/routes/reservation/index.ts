import { Router } from 'express'
import { reservationHandler } from './reservationHandler.js'
import {
  validateBody,
  validateParams,
  validateQuery,
} from '@book-library-tool/api'
import { schemas } from '@book-library-tool/api'
import { paginationMiddleware } from '@book-library-tool/sdk'

export default Router()
  .post(
    '/',
    validateBody(schemas.ReservationRequestSchema),
    reservationHandler.createReservation,
  )
  .get(
    '/user/:userId',
    validateParams(schemas.UserIdSchema),
    validateQuery(schemas.ReservationsHistoryQuerySchema),
    paginationMiddleware(),
    reservationHandler.getReservationHistory,
  )
  .patch(
    '/:reservationId/return',
    validateParams(schemas.ReservationReturnParamsSchema),
    reservationHandler.returnReservation,
  )
