import { EventBus } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { Reservation } from '@reservations/entities/Reservation.js'
import { IReservationWriteRepository } from '@reservations/repositories/IReservationWriteRepository.js'
import { BookBroughtCommand } from '@reservations/use_cases/commands/BookBroughtCommand.js'

/**
 * Handler for processing book purchase scenarios in the reservation system.
 * This handler manages the business logic when a book is considered purchased,
 * particularly in cases where late fees have accumulated to the point of purchase.
 *
 * The handler ensures proper event sourcing by:
 * 1. Retrieving and rehydrating the reservation aggregate
 * 2. Validating the user's authorization
 * 3. Generating and persisting the appropriate domain events
 * 4. Publishing events to the event bus for other bounded contexts
 */
export class BookBroughtHandler {
  constructor(
    private readonly reservationWriteRepository: IReservationWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Processes a book purchase that occurs due to accumulated late fees.
   * This method handles the business logic when a user's late fees reach
   * the purchase price of the book, effectively converting the reservation
   * into a purchase.
   *
   * The process includes:
   * 1. Retrieving the reservation's event stream
   * 2. Rehydrating the reservation aggregate
   * 3. Verifying user authorization
   * 4. Generating the purchase event
   * 5. Persisting and publishing the event
   *
   * @param command - The command containing the reservationId and userId
   * @returns Promise that resolves when the process is complete
   *
   * @throws {Error} If there are issues with event persistence or publishing
   *                 (errors are logged but not propagated to maintain system stability)
   */
  async execute(command: BookBroughtCommand): Promise<void> {
    try {
      logger.info(
        `Processing book purchase via late fee for reservation ${command.reservationId}`,
      )

      // Retrieve events for the reservation
      const reservationEvents =
        await this.reservationWriteRepository.getEventsForAggregate(
          command.reservationId,
        )

      if (!reservationEvents.length) {
        logger.error(
          `Reservation with ID ${command.reservationId} not found for late fee purchase`,
        )

        return
      }

      // Rehydrate the reservation aggregate
      const reservation = Reservation.rehydrate(reservationEvents)

      // Verify the user matches (extra security check)
      if (reservation.userId !== command.userId) {
        logger.error(
          `User mismatch for reservation ${command.reservationId}: expected ${reservation.userId}, got ${command.userId}`,
        )

        return
      }

      // Mark the book as brought due to purchase via late fees
      const result = reservation.markAsBroughtViaPurchase()

      // Save the event
      await this.reservationWriteRepository.saveEvents(
        reservation.id,
        [result.event],
        reservation.version,
      )

      // Publish the event
      await this.eventBus.publish(result.event)

      logger.info(
        `Book marked as brought via purchase for reservation ${command.reservationId}`,
      )
    } catch (error) {
      logger.error(
        `Error processing book purchase via late fee: ${error.message}`,
      )
    }
  }
}
