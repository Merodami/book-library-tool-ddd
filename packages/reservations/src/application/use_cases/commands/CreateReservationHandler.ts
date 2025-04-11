import {
  type DomainEvent,
  type EventBus,
  RESERVATION_BOOK_VALIDATION,
} from '@book-library-tool/event-store'
import type { ReservationRequest } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from '@entities/Reservation.js'
import { IReservationProjectionRepository } from '@repositories/IReservationProjectionRepository.js'
import { IReservationRepository } from '@repositories/IReservationRepository.js'

/**
 * Handles the creation of new reservations.
 * This is a command handler that performs write operations and emits events.
 */
export class CreateReservationHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly reservationProjectionRepository: IReservationProjectionRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Creates a new reservation based on the provided command.
   *
   * @param command - The reservation request data
   * @returns The ID of the newly created reservation
   */
  async execute(command: ReservationRequest): Promise<void> {
    // Validate command data
    if (!command.userId || !command.isbn) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.RESERVATION_INVALID_DATA,
        'User ID and ISBN are required',
      )
    }

    // Check if user already has an active reservation for this book
    const existingReservation =
      await this.reservationProjectionRepository.getBookReservations(
        command.isbn,
        command.userId,
      )

    if (existingReservation.data.length > 0) {
      throw new Errors.ApplicationError(
        409,
        ErrorCode.RESERVATION_ALREADY_EXISTS,
        `User ${command.userId} already has an active reservation for book ${command.isbn}`,
      )
    }

    // Create the Reservation aggregate and capture the corresponding ReservationCreated event
    // We don't care about book existence for eventual consistency
    const { reservation, event } = Reservation.create({
      userId: command.userId.trim(),
      isbn: command.isbn.trim(),
      reservedAt: new Date().toISOString(),
      status: RESERVATION_STATUS.PENDING,
    })

    // Persist the new event with the expected aggregate version (0 for new aggregates)
    await this.reservationRepository.saveEvents(reservation.id, [event], 0)

    // Publish a separate event to request book validation
    const validationEvent: DomainEvent = {
      eventType: RESERVATION_BOOK_VALIDATION,
      aggregateId: reservation.id,
      payload: {
        reservationId: reservation.id,
        isbn: command.isbn,
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    await this.eventBus.publish(validationEvent)

    // Publish the event so that any subscribers (e.g. projectors, integration handlers) are notified
    await this.eventBus.publish(event)

    // Clear domain events after they've been persisted and published
    reservation.clearDomainEvents()
  }
}
