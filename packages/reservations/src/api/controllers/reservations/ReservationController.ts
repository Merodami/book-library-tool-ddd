import type {
  ReservationRequest,
  ReservationReturnParams,
  ReservationsHistoryQuery,
  UserId,
} from '@book-library-tool/sdk'
import { NextFunction, Request, Response } from 'express'

import { ReservationFacade } from './ReservationFacade.js'

export class ReservationController {
  constructor(private readonly reservationService: ReservationFacade) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.createReservation = this.createReservation.bind(this)
    this.getReservationHistory = this.getReservationHistory.bind(this)
    this.returnReservation = this.returnReservation.bind(this)
  }

  /**
   * POST /reservations
   * Create a new reservation.
   * Expects a JSON body with:
   * {
   *   "userId": string,
   *   "isbn": string
   * }
   * The ReservationFacade will generate a ReservationCreated event, persist it, and publish it.
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

      // Delegate to the facade; the facade will delegate to the appropriate handler
      // which enforces business rules and generates events.
      const newReservation =
        await this.reservationService.createReservation(reservationCommand)

      res.status(201).json(newReservation)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /reservations/user/:userId
   * Retrieve a user's reservation history.
   * This uses the projection repository through the query handler.
   */
  async getReservationHistory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params as UserId
      const { page, limit } = req.query as ReservationsHistoryQuery

      // Uses the query handler to retrieve data from the projection repository
      const history = await this.reservationService.getReservationHistory({
        userId,
        page: page || 1,
        limit: limit || 10,
      })

      res.status(200).json(history)
    } catch (error) {
      next(error)
    }
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

      // Execute the command through the facade
      const result = await this.reservationService.returnReservation({
        reservationId,
      })

      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }
}
