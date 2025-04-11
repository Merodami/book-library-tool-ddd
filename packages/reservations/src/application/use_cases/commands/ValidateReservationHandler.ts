import {
  BOOK_VALIDATION_FAILED,
  DomainEvent,
  type EventBus,
  RESERVATION_BOOK_LIMIT_REACH,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Reservation } from '@entities/Reservation.js'
import type { IReservationRepository } from '@repositories/IReservationRepository.js'

import type { IReservationProjectionRepository } from '../../../domain/repositories/IReservationProjectionRepository.js'
import { ReservationProjectionHandler } from '../../../infrastructure/event-store/ReservationProjectionHandler.js'

/**
 * Handler responsible for validating reservations based on book availability
 * and user reservation limits. It processes BookValidationResult events and
 * applies domain-specific business rules before confirming or rejecting reservations.
 * Part of the command-side in the CQRS pattern.
 */
export class ValidateReservationHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly reservationProjectionRepository: IReservationProjectionRepository,
    private readonly projectionHandler: ReservationProjectionHandler,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Processes a book validation result and applies business rules.
   * Checks both book availability and user reservation limits before
   * confirming or rejecting a reservation.
   *
   * @param event - The BookValidationResult event
   * @param command - Command with validation details
   */
  async execute(
    event: DomainEvent,
    command: {
      reservationId: string
      isValid: boolean
      reason?: string
    },
  ): Promise<void> {
    // Load the reservation aggregate from event store
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

    // Rebuild the aggregate
    const reservation = Reservation.rehydrate(reservationEvents)

    // Create a modified validation event for the projection handler
    const projectionEvent = await this.createProjectionEvent(
      event,
      command,
      reservation,
    )

    // Determine the appropriate action
    const result = await this.determineReservationAction(command, reservation)
    const newEvent = result.event

    // Update the read model first
    await this.projectionHandler.handleBookValidationResult(projectionEvent)

    // Save the domain event to the event store
    await this.reservationRepository.saveEvents(
      reservation.id,
      [newEvent],
      reservation.version,
    )

    // Publish the domain event
    await this.eventBus.publish(newEvent)
  }

  /**
   * Creates a modified event for the projection handler that includes the final
   * validation result after applying all business rules like reservation limits.
   * This ensures the read model accurately reflects the reservation state.
   */
  private async createProjectionEvent(
    event: DomainEvent,
    command: { reservationId: string; isValid: boolean; reason?: string },
    reservation: Reservation,
  ): Promise<DomainEvent> {
    if (!command.isValid) {
      return event
    }

    const activeReservationsCount =
      await this.reservationProjectionRepository.countActiveReservationsByUser(
        reservation.userId,
      )

    const maxReservations = Number(process.env.BOOK_MAX_RESERVATION_USER) || 3

    const exceedsLimit = activeReservationsCount > maxReservations

    if (exceedsLimit) {
      return {
        ...event,
        payload: {
          ...event.payload,
          isValid: false,
          reason: RESERVATION_BOOK_LIMIT_REACH,
        },
      }
    }

    return event
  }

  /**
   * Determines the appropriate action for a reservation based on validation results
   * and business rules. This applies domain logic to decide whether to confirm or
   * reject the reservation.
   */
  private async determineReservationAction(
    command: { reservationId: string; isValid: boolean; reason?: string },
    reservation: Reservation,
  ): Promise<{ reservation: Reservation; event: DomainEvent }> {
    if (!command.isValid) {
      return reservation.reject(command.reason || BOOK_VALIDATION_FAILED)
    }

    const activeReservationsCount =
      await this.reservationProjectionRepository.countActiveReservationsByUser(
        reservation.userId,
      )

    const maxReservations = Number(process.env.BOOK_MAX_RESERVATION_USER) || 3

    if (activeReservationsCount > maxReservations) {
      return reservation.reject(RESERVATION_BOOK_LIMIT_REACH)
    }

    return reservation.setPaymentPending()
  }
}
