import type { EventBus } from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Reservation } from '@entities/Reservation.js'
import type { IReservationRepository } from '@repositories/IReservationRepository.js'

export class ValidateReservationHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: {
    reservationId: string
    isValid: boolean
    reason?: string
  }): Promise<void> {
    // Get the reservation events
    const reservationEvents =
      await this.reservationRepository.getEventsForAggregate(
        command.reservationId,
      )

    if (!reservationEvents.length) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.RESERVATION_NOT_FOUND,
        `Reservation with ID ${command.reservationId} not found`,
      )
    }

    // Rebuild the aggregate using the rehydrate method
    const reservation = Reservation.rehydrate(reservationEvents)

    // Update the reservation based on validation result
    let newEvent
    if (command.isValid) {
      const result = reservation.confirm()

      newEvent = result.event
    } else {
      const result = reservation.reject(
        command.reason || 'Book validation failed',
      )

      newEvent = result.event
    }

    // Save and publish the new event
    await this.reservationRepository.saveEvents(
      reservation.id,
      [newEvent],
      reservation.version,
    )

    // Publish event
    await this.eventBus.publish(newEvent)
  }
}
