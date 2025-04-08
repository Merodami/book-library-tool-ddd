import { Request, Response, NextFunction } from 'express'
import type {
  ReservationRequest,
  ReservationReturnParams,
  UserId,
} from '@book-library-tool/sdk'
import { ReservationService } from '@use_cases/ReservationService.js'

export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {
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
   */
  async createReservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId, isbn } = req.body as ReservationRequest

      // Delegate to the service; the service will enforce business rules.
      const newReservation = await this.reservationService.createReservation({
        userId,
        isbn,
      })

      res.status(201).json(newReservation)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /reservations/user/:userId
   * Retrieve a user's reservation history.
   */
  async getReservationHistory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params as UserId

      const history =
        await this.reservationService.getReservationHistory(userId)

      res.status(200).json(history)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /reservations/:reservationId/return
   * Mark a reservation as returned.
   * Expects a JSON body:
   * {
   *   "retailPrice": number
   * }
   * The service will apply late fees and determine if the reservation should be marked as "returned" or "bought".
   */
  async returnReservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { reservationId } = req.params as ReservationReturnParams

      const result =
        await this.reservationService.returnReservation(reservationId)

      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }
}
