import type { ReservationsHistoryQuery, UserId } from '@book-library-tool/sdk'
import { GetReservationHistoryHandler } from '@queries/GetReservationHistoryHandler.js'
import { NextFunction, Request, Response } from 'express'

export class GetReservationHistoryController {
  constructor(
    private readonly getReservationHistoryHandler: GetReservationHistoryHandler,
  ) {
    // Bind methods to ensure the correct "this" context when used as callbacks
    this.getReservationHistory = this.getReservationHistory.bind(this)
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

      // Call the handler directly to retrieve data from the projection repository
      const history = await this.getReservationHistoryHandler.execute({
        userId,
        page: page ? Math.floor(Number(page)) : 1,
        limit: limit ? Math.floor(Number(limit)) : 10,
      })

      res.status(200).json(history)
    } catch (error) {
      next(error)
    }
  }
}
