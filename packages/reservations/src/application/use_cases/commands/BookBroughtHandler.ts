import { EventBus } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { Reservation } from '@entities/Reservation.js'
import { IReservationRepository } from '@repositories/IReservationRepository.js'

export class BookBroughtHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Handles the scenario when a book is considered purchased due to late fees
   */
  async handleBookPurchasedViaLateFee(
    userId: string,
    reservationId: string,
  ): Promise<void> {
    try {
      logger.info(
        `Processing book purchase via late fee for reservation ${reservationId}`,
      )

      // Retrieve events for the reservation
      const reservationEvents =
        await this.reservationRepository.getEventsForAggregate(reservationId)

      if (!reservationEvents.length) {
        logger.error(
          `Reservation with ID ${reservationId} not found for late fee purchase`,
        )
        return
      }

      // Rehydrate the reservation aggregate
      const reservation = Reservation.rehydrate(reservationEvents)

      // Verify the user matches (extra security check)
      if (reservation.userId !== userId) {
        logger.error(
          `User mismatch for reservation ${reservationId}: expected ${reservation.userId}, got ${userId}`,
        )
        return
      }

      // Mark the book as brought due to purchase via late fees
      const result = reservation.markAsBroughtViaPurchase()

      // Save the event
      await this.reservationRepository.saveEvents(
        reservation.id,
        [result.event],
        reservation.version,
      )

      // Publish the event
      await this.eventBus.publish(result.event)

      logger.info(
        `Book marked as brought via purchase for reservation ${reservationId}`,
      )
    } catch (error) {
      logger.error(
        `Error processing book purchase via late fee: ${error.message}`,
      )
    }
  }
}
