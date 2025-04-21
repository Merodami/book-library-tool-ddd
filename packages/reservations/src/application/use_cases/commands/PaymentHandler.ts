import { DomainEvent, type EventBus } from '@book-library-tool/event-store'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { Reservation } from '@reservations/entities/Reservation.js'
import { ReservationProjectionHandler } from '@reservations/event-store/ReservationProjectionHandler.js'
import type { IReservationRepository } from '@reservations/repositories/IReservationRepository.js'

/**
 * Handler responsible for processing payment events from the Wallet service.
 * Updates both the write model (event store) and read model (projection) based on
 * payment success or failure. Part of the command-side in the CQRS pattern.
 */
export class PaymentHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly projectionHandler: ReservationProjectionHandler,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Processes a successful payment event and updates the reservation status.
   *
   * @param event - The WalletPaymentSuccess event
   */
  async handlePaymentSuccess(event: DomainEvent): Promise<void> {
    const reservationId = event.payload.reservationId

    logger.info(
      `Processing successful payment for reservation ${reservationId}`,
    )

    try {
      // Load the reservation aggregate from event store
      const reservationEvents =
        await this.reservationRepository.getEventsForAggregate(reservationId)

      if (!reservationEvents.length) {
        throw new Errors.ApplicationError(
          404,
          ErrorCode.RESERVATION_NOT_FOUND,
          `Reservation with ID ${reservationId} not found`,
        )
      }

      // Rebuild the aggregate
      const reservation = Reservation.rehydrate(reservationEvents)

      // Apply payment confirmation to the aggregate
      const { event: newEvent } = reservation.confirm(
        event.payload.paymentReference,
        event.payload.paymentMethod,
        event.payload.amount,
      )

      // Save the domain event to the event store
      await this.reservationRepository.saveEvents(
        reservation.id,
        [newEvent],
        reservation.version,
      )

      // Update the read model (projection)
      await this.projectionHandler.handlePaymentSuccess(newEvent)

      // Publish the domain event
      await this.eventBus.publish(newEvent)

      logger.info(
        `Reservation ${reservationId} confirmed after successful payment`,
      )
    } catch (error) {
      logger.error(
        `Error handling payment success for reservation ${reservationId}:`,
        error,
      )
      throw error
    }
  }

  /**
   * Processes a declined payment event and updates the reservation status.
   *
   * @param event - The WalletPaymentDeclined event
   */
  async handlePaymentDeclined(event: DomainEvent): Promise<void> {
    const reservationId = event.payload.reservationId

    logger.info(`Processing declined payment for reservation ${reservationId}`)

    try {
      // Load the reservation aggregate from event store
      const reservationEvents =
        await this.reservationRepository.getEventsForAggregate(reservationId)

      if (!reservationEvents.length) {
        throw new Errors.ApplicationError(
          404,
          ErrorCode.RESERVATION_NOT_FOUND,
          `Reservation with ID ${reservationId} not found`,
        )
      }

      // Rebuild the aggregate
      const reservation = Reservation.rehydrate(reservationEvents)

      // Apply payment rejection to the aggregate
      const { event: newEvent } = reservation.reject(
        event.payload.reason || 'Payment declined',
      )

      // Save the domain event to the event store
      await this.reservationRepository.saveEvents(
        reservation.id,
        [newEvent],
        reservation.version,
      )

      // Update the read model (projection)
      await this.projectionHandler.handlePaymentDeclined(newEvent)

      // Publish the domain event
      await this.eventBus.publish(newEvent)

      logger.info(
        `Reservation ${reservationId} rejected after declined payment`,
      )
    } catch (error) {
      logger.error(
        `Error handling payment decline for reservation ${reservationId}:`,
        error,
      )

      throw error
    }
  }
}
