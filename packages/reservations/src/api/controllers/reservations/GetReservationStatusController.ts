import { Reservation } from '@book-library-tool/sdk'
import { GetReservationStatusHandler } from '@queries/GetReservationStatusHandler.js'
import { NextFunction, Request, Response } from 'express'

export class GetReservationStatusController {
  constructor(
    private readonly getReservationStatusHandler: GetReservationStatusHandler,
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

      // Call the handler directly
      const reservationStatus = await this.getReservationStatusHandler.execute({
        reservationId,
      })

      res.status(200).json(reservationStatus)
    } catch (error) {
      next(error)
    }
  }
}
