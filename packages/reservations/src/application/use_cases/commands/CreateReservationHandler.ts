import {
  type EventBusPort,
  RESERVATION_BOOK_VALIDATION,
} from '@book-library-tool/event-store'
import { EventResponse } from '@book-library-tool/sdk'
import type { DomainEvent } from '@book-library-tool/shared'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { CreateReservationCommand } from '@reservations/application/use_cases/commands/CreateReservationCommand.js'
import { Reservation } from '@reservations/domain/entities/Reservation.js'
import {
  ReservationReadProjectionRepositoryPort,
  ReservationWriteRepositoryPort,
} from 'src/domain/port/index.js'

/**
 * Handles the creation of new reservations.
 * This is a command handler that performs write operations and emits events.
 */
export class CreateReservationHandler {
  constructor(
    private readonly reservationWriteRepository: ReservationWriteRepositoryPort,
    private readonly reservationReadProjectionRepository: ReservationReadProjectionRepositoryPort,
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Creates a new reservation based on the provided command.
   *
   * @param command - The reservation request data
   * @returns The ID of the newly created reservation
   */
  async execute(
    command: CreateReservationCommand,
  ): Promise<EventResponse & { id: string }> {
    // Validate command data
    if (!command.userId || !command.bookId) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.RESERVATION_INVALID_DATA,
        'User ID and Book ID are required',
      )
    }

    // Check if user already has an active reservation for this book
    const exiting =
      await this.reservationReadProjectionRepository.hasActiveReservations(
        command.bookId,
        command.userId,
      )

    if (exiting) {
      throw new Errors.ApplicationError(
        409,
        ErrorCode.RESERVATION_ALREADY_EXISTS,
        `User ${command.userId} already has an active reservation for book ${command.bookId}`,
      )
    }

    // Create the Reservation aggregate and capture the corresponding ReservationCreated event
    // We don't care about book existence for eventual consistency
    const { reservation, event } = Reservation.create({
      userId: command.userId.trim(),
      bookId: command.bookId.trim(),
      reservedAt: new Date().toISOString(),
      status: RESERVATION_STATUS.CREATED,
    })

    // Persist the new event with the expected aggregate version (0 for new aggregates)
    await this.reservationWriteRepository.saveEvents(reservation.id, [event], 0)

    // Publish a separate event to request book validation
    const validationEvent: DomainEvent = {
      eventType: RESERVATION_BOOK_VALIDATION,
      aggregateId: reservation.id,
      payload: {
        reservationId: reservation.id,
        bookId: command.bookId,
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

    // Return the reservation entity
    return {
      success: true,
      id: reservation.id,
      version: reservation.version,
    }
  }
}
