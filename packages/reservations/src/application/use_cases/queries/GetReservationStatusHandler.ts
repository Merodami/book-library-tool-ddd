import { schemas } from '@book-library-tool/api'
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
   * @param query - Contains the id to check
   * @returns The current status of the reservation
   * @throws {Errors.ApplicationError} If the reservation is not found
   */
  async execute(query: schemas.IdParameter): Promise<schemas.ReservationDTO> {
    // Validate the query
    if (!query.id) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.INVALID_QUERY,
        'Reservation ID is required',
      )
    }

    // Query the projection repository for the reservation details
    const reservation =
      await this.reservationProjectionRepository.getReservationById(query.id)

    // Handle not found case with proper error
    if (!reservation) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.RESERVATION_NOT_FOUND,
        `Reservation with ID ${query.id} not found`,
      )
    }

    // Format and return the reservation status
    return {
      id: query.id,
      status: reservation.status as RESERVATION_STATUS,
      userId: reservation.userId,
      isbn: reservation.isbn,
      reservedAt: reservation.reservedAt,
      feeCharged: reservation.feeCharged,
      createdAt: reservation.createdAt,
      dueDate: reservation.dueDate,
      updatedAt: reservation.updatedAt,
    }
  }
}
