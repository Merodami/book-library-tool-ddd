import type { ReservationRequest } from '@book-library-tool/sdk'
import { CreateReservationHandler } from '@commands/CreateReservationHandler.js'
import { NextFunction, Request, Response } from 'express'

export class CreateReservationController {
  constructor(
    private readonly createReservationHandler: CreateReservationHandler,
  ) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.createReservation = this.createReservation.bind(this)
  }

  /**
   * POST /reservations
   * Create a new reservation.
   * Expects a JSON body with:
   * {
   *   "userId": string,
   *   "isbn": string
   * }
   * The handler will generate a ReservationCreated event, persist it, and publish it.
   */
  async createReservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId, isbn } = req.body as ReservationRequest

      // Build the command
      const reservationCommand: ReservationRequest = {
        userId,
        isbn,
      }

      // Directly delegate to the handler which enforces business rules and generates events
      await this.createReservationHandler.execute(reservationCommand)

      res
        .status(201)
        .json({ success: true, message: 'Reservation created successfully' })
    } catch (error) {
      next(error)
    }
  }
}
