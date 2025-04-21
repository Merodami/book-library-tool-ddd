import {
  BOOK_VALIDATION_FAILED,
  DomainEvent,
  type EventBus,
  RESERVATION_BOOK_LIMIT_REACH,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { ValidateReservationCommand } from '@reservations/commands/ValidateReservationCommand.js'
import { Reservation } from '@reservations/entities/Reservation.js'
import { ReservationProjectionHandler } from '@reservations/event-store/ReservationProjectionHandler.js'
import type { IReservationProjectionRepository } from '@reservations/repositories/IReservationProjectionRepository.js'
import type { IReservationRepository } from '@reservations/repositories/IReservationRepository.js'

/**
 * Handler responsible for validating reservations based on book availability
 * and user reservation limits. It processes BookValidationResult events and
 * applies domain-specific business rules before confirming or rejecting reservations.
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
    command: ValidateReservationCommand,
  ): Promise<void> {
    try {
      logger.debug(
        `Processing validation for reservation ${command.reservationId}`,
      )

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

      // Check active reservations count only once
      const maxReservations = parseInt(
        process.env.MAX_RESERVATIONS_PER_USER ?? '3',
        10,
      )

      let exceedsLimit = false

      // Only check reservation limits if the initial validation passed
      if (command.isValid) {
        const activeReservationsCount =
          await this.reservationProjectionRepository.countActiveReservationsByUser(
            reservation.userId,
          )

        exceedsLimit = activeReservationsCount >= maxReservations
      }

      // Create a modified validation event for the projection handler
      const projectionEvent = this.createProjectionEvent(
        event,
        command,
        exceedsLimit,
      )

      // Update the read model first to reflect validation result
      await this.projectionHandler.handleBookValidationResult(projectionEvent)

      // Process the domain events one by one to maintain proper state
      await this.processDomainActions(command, reservation, exceedsLimit)

      logger.info(
        `Completed validation processing for reservation ${command.reservationId}`,
      )
    } catch (error) {
      logger.error(
        `Error processing validation for reservation ${command.reservationId}: ${error.message}`,
      )
      throw error
    }
  }

  /**
   * Creates a modified event for the projection handler that includes the final
   * validation result after applying all business rules like reservation limits.
   * This ensures the read model accurately reflects the reservation state.
   */
  private createProjectionEvent(
    event: DomainEvent,
    command: ValidateReservationCommand,
    exceedsLimit: boolean,
  ): DomainEvent {
    if (!command.isValid) {
      return event
    }

    if (exceedsLimit) {
      return {
        ...event,
        payload: {
          ...event.payload,
          isValid: false,
          reason: RESERVATION_STATUS.RESERVATION_BOOK_LIMIT_REACH,
        },
      }
    }

    return event
  }

  /**
   * Processes the domain actions sequentially, ensuring proper state transitions
   * and event versioning. This approach maintains the aggregate state correctly
   * through each operation.
   */
  private async processDomainActions(
    command: ValidateReservationCommand,
    reservation: Reservation,
    exceedsLimit: boolean,
  ): Promise<void> {
    let currentReservation = reservation
    let currentVersion = reservation.version

    // Handle rejection cases first
    if (!command.isValid) {
      const result = currentReservation.reject(
        command.reason || BOOK_VALIDATION_FAILED,
      )

      await this.saveAndPublishEvent(result.event, currentVersion)

      return
    }

    if (exceedsLimit) {
      const result = currentReservation.reject(RESERVATION_BOOK_LIMIT_REACH)

      await this.saveAndPublishEvent(result.event, currentVersion)

      return
    }

    // Set retail price if provided
    if (command.retailPrice && command.retailPrice > 0) {
      logger.debug(
        `Setting retail price to ${command.retailPrice} for reservation ${reservation.id}`,
      )

      const priceResult = currentReservation.setRetailPrice(command.retailPrice)

      // Save and publish retail price event
      await this.saveAndPublishEvent(priceResult.event, currentVersion)

      // Update our working variables for the next operation
      currentReservation = priceResult.reservation
      currentVersion++
    }

    // Set payment pending status
    const paymentResult = currentReservation.setPaymentPending()

    const paymentResultWithReservationId = {
      ...paymentResult.event,
      payload: {
        ...paymentResult.event.payload,
        reservationId: currentReservation.id,
      },
    }

    // Save and publish payment pending event
    await this.saveAndPublishEvent(
      paymentResultWithReservationId,
      currentVersion,
    )
  }

  /**
   * Helper method to save and publish a domain event
   */
  private async saveAndPublishEvent(
    event: DomainEvent,
    expectedVersion: number,
  ): Promise<void> {
    // Save the event to the event store
    await this.reservationRepository.saveEvents(
      event.aggregateId,
      [event],
      expectedVersion,
    )

    // Publish the event
    await this.eventBus.publish(event)

    logger.debug(
      `Saved and published event ${event.eventType} for aggregate ${event.aggregateId}`,
    )
  }
}
