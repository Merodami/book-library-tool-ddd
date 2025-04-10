import { Reservation } from '@book-library-tool/sdk'
import { GetReservationStatusHandler } from '@queries/GetReservationStatusHandler.js'

/**
 * The ReservationStatusFacade serves as a unified interface for reservation status queries.
 * It only handles read operations using the projection repository.
 */
export class ReservationStatusFacade {
  constructor(
    private readonly getReservationStatusHandler: GetReservationStatusHandler,
  ) {}

  /**
   * Gets the current status of a reservation by delegating to the GetReservationStatusHandler.
   *
   * @param query - Contains the reservationId to check
   * @returns The current status of the reservation
   */
  async getReservationStatus(
    query: Pick<Reservation, 'reservationId'>,
  ): Promise<Reservation> {
    return this.getReservationStatusHandler.execute(query)
  }
}
