import type { EventBus } from '@book-library-tool/event-store'
import { EventResponse } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { IReservationRepository } from '@reservations/repositories/IReservationRepository.js'

/**
 * Handles the return of reserved books.
 * This is a command handler that performs write operations and emits events.
 */
export class BookReturnHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Processes a book return based on the provided command.
   *
   * @param command - Contains the id to return
   * @returns The ID of the updated reservation
   */
  async execute(command: {
    id: string
  }): Promise<EventResponse & { id: string }> {
    // Validate command data
    if (!command.id) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.RESERVATION_INVALID_DATA,
        'Reservation ID is required',
      )
    }

    // Retrieve the reservation
    const reservation = await this.reservationRepository.findById(command.id)

    if (!reservation) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.RESERVATION_NOT_FOUND,
        `Reservation with ID ${command.id} not found`,
      )
    }

    // Process the return in the domain entity, which will calculate late fees and create the appropriate event
    const { reservation: updatedReservation, event } =
      reservation.markAsReturned()

    // Persist the return event with the current version
    await this.reservationRepository.saveEvents(
      updatedReservation.id,
      [event],
      reservation.version,
    )

    // Publish the event so subscribers can react to it
    await this.eventBus.publish(event)

    // Clear domain events after they've been persisted and published
    updatedReservation.clearDomainEvents()

    return {
      success: true,
      id: updatedReservation.id,
      version: updatedReservation.version,
    }
  }
}
