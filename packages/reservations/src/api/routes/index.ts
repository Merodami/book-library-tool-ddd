import { Router } from 'express'
import reservationRoute from './reservations/reservationRoute.js'
import { ReservationController } from '../controllers/reservationController.js'

export default function (reservationController: ReservationController) {
  const router = Router()

  router.use('/reservations', reservationRoute(reservationController))

  return router
}
