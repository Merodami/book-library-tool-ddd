// File: @commands/CreateReservationHandler.ts
import type { EventBus } from '@book-library-tool/event-store'
import type { ReservationRequest } from '@book-library-tool/sdk'
import { Errors } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from '@entities/Reservation.js'
import type { IReservationRepository } from '@repositories/IReservationRepository.js'

/**
 * Handles the creation of new reservations.
 * This is a command handler that performs write operations and emits events.
 */
export class CreateReservationHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository,
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
        'INVALID_RESERVATION_DATA',
        'User ID and ISBN are required',
      )
    }

    // Check if user already has an active reservation for this book
    const existingReservation =
      await this.reservationRepository.findActiveByUserAndIsbn(
        command.userId,
        command.isbn,
      )

    if (existingReservation) {
      throw new Errors.ApplicationError(
        409,
        'DUPLICATE_RESERVATION',
        `User ${command.userId} already has an active reservation for book ${command.isbn}`,
      )
    }

    // Create the Reservation aggregate and capture the corresponding ReservationCreated event
    const { reservation, event } = Reservation.create({
      userId: command.userId.trim(),
      isbn: command.isbn.trim(),
      reservedAt: new Date().toISOString(),
      status: RESERVATION_STATUS.RESERVED,
    })

    // Persist the new event with the expected aggregate version (0 for new aggregates)
    await this.reservationRepository.saveEvents(reservation.id, [event], 0)

    // Publish the event so that any subscribers (e.g. projectors, integration handlers) are notified
    await this.eventBus.publish(event)

    // Clear domain events after they've been persisted and published
    reservation.clearDomainEvents()
  }
}
