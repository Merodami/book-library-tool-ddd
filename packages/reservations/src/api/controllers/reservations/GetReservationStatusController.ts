import { schemas } from '@book-library-tool/api'
import { Cache } from '@book-library-tool/redis'
import { GetReservationStatusHandler } from '@reservations/queries/GetReservationStatusHandler.js'
import type { NextFunction, Request, Response } from 'express'

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
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'reservation:status',
    condition: (result) => result !== null,
  })
  async getReservationStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { reservationId } = req.params as Pick<
        schemas.ReservationDTO,
        'reservationId'
      >

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
