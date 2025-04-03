import { Request, Response, NextFunction } from 'express'
import { DatabaseService, getPaginatedData } from '@book-library-tool/database'
import {
  apiWallet,
  Book,
  Reservation,
  ReservationRequest,
  User,
  UserId,
} from '@book-library-tool/sdk'
import { ReservationStatus } from '@book-library-tool/types'
import { randomUUID } from 'crypto'

// Define active statuses as a constant array.
const ACTIVE_STATUSES = ['reserved', 'borrowed', 'late'] as const

export const reservationHandler = {
  /**
   * POST /reservations
   * Create a new reservation (borrow a book).
   * Expects a JSON body:
   * {
   *   "userId": uuid,
   *   "referenceId": string
   * }
   */
  async createReservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId, referenceId } = req.body as ReservationRequest

      const booksCollection = DatabaseService.getCollection<Book>('books')

      // Check that the referenced book exists.
      const referencedBook = await DatabaseService.findOne<Book>(
        booksCollection,
        {
          id: referenceId.trim(),
        },
      )

      if (!referencedBook) {
        res.status(404).json({ message: 'Referenced book not found.' })
        return
      }

      const usersCollection = DatabaseService.getCollection<User>('users')

      // Check that the user exists.
      const referenceUser = await DatabaseService.findOne<User>(
        usersCollection,
        { userId: userId.trim() },
      )

      if (!referenceUser) {
        res.status(404).json({ message: 'User not found.' })
        return
      }

      // Verify user's wallet has enough balance.
      try {
        const userWallet = await apiWallet.default.getWallets({ userId })

        if (userWallet.balance < 3) {
          res.status(400).json({
            message: 'User does not have enough balance to reserve a book.',
          })
          return
        }
      } catch (error) {
        res.status(500).json({
          message: 'Error fetching user balance.',
          error: (error as Error).message,
        })
        return
      }

      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      // Check active reservations for the user.
      const userActiveCount = await DatabaseService.countDocuments(
        reservationsCollection,
        {
          userId: userId.trim(),
          status: { $in: ACTIVE_STATUSES },
        },
      )

      if (userActiveCount >= 3) {
        res.status(400).json({
          message: 'User cannot borrow more than 3 books at the same time.',
        })
        return
      }

      // Check if the user already reserved this reference.
      const existingReservation = await DatabaseService.findOne<Reservation>(
        reservationsCollection,
        {
          userId: userId.trim(),
          referenceId: referenceId.trim(),
          status: { $in: ACTIVE_STATUSES },
        },
      )

      if (existingReservation) {
        res.status(400).json({
          message:
            'User already has an active reservation for this book reference.',
        })
        return
      }

      // Check availability: Only 4 copies exist per reference.
      const activeForReference = await DatabaseService.countDocuments(
        reservationsCollection,
        {
          referenceId: referenceId.trim(),
          status: { $in: ACTIVE_STATUSES },
        },
      )

      if (activeForReference >= 4) {
        res
          .status(400)
          .json({ message: 'No copies available for this book reference.' })
        return
      }

      // Create the new reservation.
      const now = new Date()
      const dueDate = new Date(
        now.getTime() +
          (Number(process.env.BOOK_RETURN_DUE_DATE_DAYS) || 5) *
            24 *
            60 *
            60 *
            1000,
      )

      const newReservation: Reservation = {
        reservationId: randomUUID(),
        userId: userId.trim(),
        referenceId: referenceId.trim(),
        reservedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'reserved',
        feeCharged: Number(process.env.BOOK_RESERVATION_FEE) || 3,
      }

      // Deduct the reservation fee from the wallet.
      await apiWallet.default.postWalletsBalance({
        userId,
        requestBody: {
          amount: -(Number(process.env.BOOK_RESERVATION_FEE) || 3),
        },
      })

      await DatabaseService.insertDocument(
        reservationsCollection,
        newReservation,
      )

      res.status(201).json(newReservation)
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /reservations/:userId
   * Retrieve a user's reservation history.
   */
  async getReservationHistory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params as UserId

      const usersCollection = DatabaseService.getCollection<User>('users')

      // Check that the user exists.
      const user = await DatabaseService.findOne<User>(usersCollection, {
        userId: userId.trim(),
      })

      if (!user) {
        res.status(404).json({ message: 'User not found.' })
        return
      }

      // Retrieve the reservation history.
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      // Use the pagination helper to get paginated reservation history.
      const paginatedHistory = await getPaginatedData<Reservation>(
        reservationsCollection,
        { userId },
        req,
        { projection: { _id: 0 }, sort: { reservedAt: -1 } },
      )

      res.status(200).json(paginatedHistory)
    } catch (error) {
      next(error)
    }
  },

  /**
   * PATCH /reservations/:reservationId/return
   * Mark a reservation as returned.
   * - If the reservation is returned late, apply a late fee (0.2€ per day).
   * - The request body must include a valid "retailPrice" if the reservation is late.
   * - If the fee is greater than or equal to the retailPrice, mark as "bought".
   * - Otherwise, mark as "returned".
   */
  async returnReservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { reservationId } = req.params

      if (!reservationId) {
        res.status(400).json({ message: 'Reservation ID is required.' })
        return
      }

      // Check that the reservation exists.
      const reservationsCollection =
        DatabaseService.getCollection<Reservation>('reservations')

      const reservation = await reservationsCollection.findOne(
        {
          reservationId,
          status: { $in: ['reserved', 'borrowed', 'late'] },
        },
        { projection: { _id: 0 } },
      )

      if (!reservation) {
        res.status(404).json({ message: 'Active reservation not found.' })
        return
      }

      const now = new Date()
      const dueDate = new Date(reservation.dueDate)

      let daysLate = 0

      if (now > dueDate) {
        daysLate = Math.floor(
          (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000),
        )
      }

      let retailPrice = 0

      const booksCollection = DatabaseService.getCollection<Book>('books')

      if (daysLate > 0) {
        // Check that the referenced book exists.
        const referencedBook = await DatabaseService.findOne<Book>(
          booksCollection,
          { id: reservation.referenceId },
        )

        if (!referencedBook) {
          res.status(404).json({ message: 'Referenced book not found.' })
          return
        }

        retailPrice = referencedBook.price
      }

      // Calculate the late fee.
      const fee =
        daysLate > 0 ? daysLate * Number(process.env.LATE_FEE_PER_DAY) : 0

      // If a late fee applies, update the wallet.
      if (fee > 0) {
        await apiWallet.default.patchWalletsLateReturn({
          userId: reservation.userId,
          requestBody: { daysLate, retailPrice },
        })
      }

      // Determine new status.
      const newStatus =
        daysLate > 0 && fee >= retailPrice
          ? ReservationStatus.BOUGHT
          : ReservationStatus.RETURNED

      await DatabaseService.updateDocument(
        reservationsCollection,
        { reservationId },
        { status: newStatus },
      )

      res.status(200).json({
        message: `Reservation marked as ${newStatus}.`,
        late_fee_applied: fee.toFixed(1),
        days_late: daysLate,
      })
    } catch (error) {
      next(error)
    }
  },
}
