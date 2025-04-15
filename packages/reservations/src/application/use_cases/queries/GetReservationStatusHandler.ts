import type { Reservation } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import type { IReservationProjectionRepository } from '@reservations/repositories/IReservationProjectionRepository.js'

/**
 * Handles queries for a specific reservation's status.
 * This is a query handler that performs read-only operations using the projection repository.
 */
export class GetReservationStatusHandler {
  constructor(
    private readonly reservationProjectionRepository: IReservationProjectionRepository,
  ) {}

  /**
   * Retrieves the current status of a reservation based on the provided query.
   *
   * @param query - Contains the reservationId to check
   * @returns The current status of the reservation
   * @throws {Errors.ApplicationError} If the reservation is not found
   */
  async execute(
    query: Pick<Reservation, 'reservationId'>,
  ): Promise<Reservation> {
    // Validate the query
    if (!query.reservationId) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.INVALID_QUERY,
        'Reservation ID is required',
      )
    }

    // Query the projection repository for the reservation details
    const reservation =
      await this.reservationProjectionRepository.getReservationById(
        query.reservationId,
      )

    // Handle not found case with proper error
    if (!reservation) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.RESERVATION_NOT_FOUND,
        `Reservation with ID ${query.reservationId} not found`,
      )
    }

    // Format and return the reservation status
    return {
      reservationId: query.reservationId, // Use the ID from the query since it's not in the mapped projection
      status: reservation.status as RESERVATION_STATUS,
      userId: reservation.userId,
      isbn: reservation.isbn,
      reservedAt: reservation.reservedAt,
      feeCharged: reservation.feeCharged,
      createdAt: reservation.createdAt,
      dueDate: reservation.dueDate,
      updatedAt: reservation.updatedAt, // Include the update timestamp
    }
  }
}
