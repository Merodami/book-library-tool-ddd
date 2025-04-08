import { Reservation } from '@entities/Reservation.js'
import { RESERVATION_STATUS } from '@book-library-tool/types'

export interface IReservationRepository {
  /**
   * Persists a new reservation into the repository.
   * @param reservation The Reservation entity to create.
   */
  create(reservation: Reservation): Promise<void>

  /**
   * Retrieves a reservation by its unique identifier.
   * @param reservationId The unique identifier for the reservation.
   * @returns The found Reservation entity, or null if not found.
   */
  findById(reservationId: string): Promise<Reservation | null>

  /**
   * Retrieves all reservations for a given user.
   * @param userId The unique identifier of the user.
   * @returns An array of Reservation entities.
   */
  findByUserId(userId: string): Promise<Reservation[]>

  /**
   * Updates the status of a reservation.
   * @param reservationId The unique identifier of the reservation.
   * @param newStatus The new status to set (e.g., RETURNED, BOUGHT).
   */
  updateStatus(
    reservationId: string,
    newStatus: RESERVATION_STATUS,
  ): Promise<void>
}
