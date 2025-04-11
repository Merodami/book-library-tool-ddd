import type { ReservationReturnParams } from '@book-library-tool/sdk'
import { BookReturnHandler } from '@commands/BookReturnHandler.js'
import { NextFunction, Request, Response } from 'express'

export class ReturnReservationController {
  constructor(private readonly returnReservationHandler: BookReturnHandler) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.returnReservation = this.returnReservation.bind(this)
  }

  /**
   * PATCH /reservations/:reservationId/return
   * Mark a reservation as returned.
   * Generates a ReservationReturned event, persists it, and publishes it.
   */
  async returnReservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { reservationId } = req.params as ReservationReturnParams

      // Execute the command directly through the handler
      await this.returnReservationHandler.execute({
        reservationId,
      })

      res.status(200).json({
        success: true,
        message: 'Reservation returned successfully',
      })
    } catch (error) {
      next(error)
    }
  }
}
