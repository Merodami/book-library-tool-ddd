import { Reservation } from '@entities/Reservation.js'
import { IReservationRepository } from '@repositories/IReservationRepository.js'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { apiBooks, apiWallet, ReservationRequest } from '@book-library-tool/sdk'

export class ReservationService {
  constructor(private readonly reservationRepository: IReservationRepository) {}

  /**
   * Creates a new reservation following business rules:
   * - Deduct the reservation fee from the user's wallet.
   * - Set the reservation status to RESERVED.
   * - Calculate due date based on BOOK_RETURN_DUE_DATE_DAYS environment variable.
   *
   * @param data - The reservation request data.
   * @returns The newly created Reservation entity.
   */
  async createReservation(data: ReservationRequest): Promise<Reservation> {
    // Create a new reservation entity.
    const newReservation = Reservation.create({
      userId: data.userId.trim(),
      isbn: data.isbn.trim(),
      reservedAt: new Date().toISOString(),
      status: RESERVATION_STATUS.RESERVED,
    })

    // Deduct reservation fee from user's wallet.
    await apiWallet.default.postWalletsBalance({
      userId: data.userId,
      requestBody: { amount: -(Number(process.env.BOOK_RESERVATION_FEE) || 3) },
    })

    // Persist the reservation using the repository.
    try {
      await this.reservationRepository.create(newReservation)
    } catch (error) {
      // If the reservation creation fails, refund the user's wallet.
      await apiWallet.default.postWalletsBalance({
        userId: data.userId,
        requestBody: { amount: Number(process.env.BOOK_RESERVATION_FEE) || 3 },
      })

      throw new Error('Failed to create reservation. Wallet refunded.')
    }

    // Update the reservation status to RESERVED.
    await this.reservationRepository.updateStatus(
      newReservation.reservationId,
      RESERVATION_STATUS.RESERVED,
    )

    return newReservation
  }

  /**
   * Retrieves the reservation history for a given user.
   *
   * @param userId - The user identifier.
   * @returns An array of Reservation entities.
   */
  async getReservationHistory(userId: string): Promise<Reservation[]> {
    return this.reservationRepository.findByUserId(userId)
  }

  /**
   * Processes the return of a reservation.
   * Business rules:
   * - Calculate how many days late the return is (if any).
   * - Compute the late fee as (daysLate * LATE_FEE_PER_DAY).
   * - If the late fee meets or exceeds the retailPrice, mark the reservation as BOUGHT;
   *   otherwise, mark it as RETURNED.
   * - Update the user's wallet if a late fee applies.
   *
   * @param reservationId - The reservation identifier.
   * @param retailPrice - The retail price of the book.
   * @returns An object containing the outcome message, late fee applied (as a string), and days late.
   */
  async returnReservation(
    reservationId: string,
  ): Promise<{ message: string; late_fee_applied: string; days_late: number }> {
    // Retrieve the active reservation.
    const reservation = await this.reservationRepository.findById(reservationId)

    if (!reservation) {
      throw new Error('Active reservation not found.')
    }

    const now = new Date()
    const dueDate = reservation.dueDate

    let daysLate = 0

    if (now > dueDate) {
      daysLate = Math.floor(
        (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000),
      )
    }

    let retailPrice = 0

    const referencedBook = await apiBooks.default.getBooks({
      isbn: reservation.isbn,
    })

    // Check that the referenced book exists.
    if (!referencedBook) {
      throw new Error('Referenced book not found.')
    }

    if (daysLate > 0) {
      retailPrice = referencedBook.price
    }

    // Calculate late fee.
    const fee =
      daysLate > 0 ? daysLate * Number(process.env.LATE_FEE_PER_DAY) : 0

    // If a late fee applies, update the user's wallet.
    if (fee > 0) {
      await apiWallet.default.patchWalletsLateReturn({
        userId: reservation.userId,
        requestBody: { daysLate, retailPrice },
      })
    }

    // Determine the new status.
    const newStatus =
      daysLate > 0 && fee >= retailPrice
        ? RESERVATION_STATUS.BOUGHT
        : RESERVATION_STATUS.RETURNED

    // Update the reservation status.
    await this.reservationRepository.updateStatus(reservationId, newStatus)

    return {
      message: `Reservation marked as ${newStatus}.`,
      late_fee_applied: fee.toFixed(1),
      days_late: daysLate,
    }
  }
}
