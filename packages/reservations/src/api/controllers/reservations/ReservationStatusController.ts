import { Reservation } from '@book-library-tool/sdk'
import { NextFunction, Request, Response } from 'express'

import { ReservationStatusFacade } from './ReservationStatusFacade.js'

export class ReservationStatusController {
  constructor(
    private readonly reservationStatusService: ReservationStatusFacade,
  ) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.getReservationStatus = this.getReservationStatus.bind(this)
  }

  /**
   * GET /reservation-status/reservation/:reservationId
   * Get the current status of a specific reservation.
   * This is a read-only operation that uses the projection repository.
   */
  async getReservationStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { reservationId } = req.params as Pick<Reservation, 'reservationId'>

      // Delegate to the facade's query handler
      const reservationStatus =
        await this.reservationStatusService.getReservationStatus({
          reservationId,
        })

      res.status(200).json(reservationStatus)
    } catch (error) {
      next(error)
    }
  }
}
