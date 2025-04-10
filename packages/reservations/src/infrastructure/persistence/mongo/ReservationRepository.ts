import {
  type DomainEvent,
  RESERVATION_CREATED,
  RESERVATION_STATUS_UPDATED,
  RESERVATION_UPDATED,
} from '@book-library-tool/event-store'
import type { ReservationRequest } from '@book-library-tool/sdk'
import { Errors, logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from '@entities/Reservation.js'
import type { IReservationRepository } from '@repositories/IReservationRepository.js'

import { BaseEventSourcedRepository } from './BaseEventSourcedRepository.js'

/**
 * Event-sourced repository implementation for Reservation aggregates.
 * Handles persisting and retrieving domain events for the reservation bounded context.
 */
export class ReservationRepository
  extends BaseEventSourcedRepository<Reservation>
  implements IReservationRepository
{
  /**
   * Create reservation-specific indexes
   * @protected
   */
  protected async createEntitySpecificIndexes(): Promise<void> {}

  /**
   * Rehydrate a Reservation from events
   * @param events Array of domain events
   * @returns Rehydrated Reservation or null
   * @protected
   */
  protected rehydrateFromEvents(events: DomainEvent[]): Reservation | null {
    try {
      return Reservation.rehydrate(events)
    } catch (error) {
      logger.error('Failed to rehydrate reservation:', error)
      return null
    }
  }

  /**
   * Create a new reservation
   *
   * @param reservationData - The data for the new reservation
   * @returns The created reservation
   */
  async createReservation(
    reservationData: ReservationRequest,
  ): Promise<Reservation> {
    const { userId, isbn } = reservationData

    if (!userId || !isbn) {
      throw new Errors.ApplicationError(
        400,
        'INVALID_RESERVATION_DATA',
        'User ID and ISBN are required',
      )
    }

    // First check if user already has an active reservation for this book
    const existingReservation = await this.findActiveByUserAndIsbn(userId, isbn)

    if (existingReservation) {
      throw new Errors.ApplicationError(
        400,
        'DUPLICATE_RESERVATION',
        `User ${userId} already has an active reservation for book ${isbn}`,
      )
    }

    // Create a new reservation entity
    const { reservation, event } = Reservation.create({
      userId,
      isbn,
      status: RESERVATION_STATUS.RESERVED,
    })

    // Save the reservation event
    await this.saveEvents(
      reservation.id,
      [event],
      0, // Expected version is 0 for a new aggregate
    )

    // Clear domain events after persisting
    reservation.clearDomainEvents()

    return reservation
  }

  /**
   * Process a book return
   *
   * @param reservationId - The ID of the reservation to return
   * @returns The updated reservation
   */
  async returnReservation(reservationId: string): Promise<Reservation> {
    // Load the reservation aggregate
    const reservation = await this.findById(reservationId)

    if (!reservation) {
      throw new Errors.ApplicationError(
        404,
        'RESERVATION_NOT_FOUND',
        `Reservation with ID ${reservationId} not found`,
      )
    }

    if (!this.isReservationActive(reservation)) {
      throw new Errors.ApplicationError(
        400,
        'INVALID_RESERVATION_STATUS',
        `Reservation is not active. Current status: ${reservation.status}`,
      )
    }

    // Process the return in the domain entity
    const { event } = reservation.markAsReturned()

    // Save the generated events
    await this.saveEvents(reservation.id, [event], reservation.version)

    // Clear domain events after persisting
    reservation.clearDomainEvents()

    return reservation
  }

  /**
   * Cancel a reservation
   *
   * @param reservationId - The ID of the reservation to cancel
   * @param reason - Optional reason for cancellation
   * @returns The updated reservation
   */
  async cancelReservation(
    reservationId: string,
    reason?: string,
  ): Promise<Reservation> {
    // Load the reservation aggregate
    const reservation = await this.findById(reservationId)

    if (!reservation) {
      throw new Errors.ApplicationError(
        404,
        'RESERVATION_NOT_FOUND',
        `Reservation with ID ${reservationId} not found`,
      )
    }

    if (!this.isReservationActive(reservation)) {
      throw new Errors.ApplicationError(
        400,
        'INVALID_RESERVATION_STATUS',
        `Reservation is not active. Current status: ${reservation.status}`,
      )
    }

    // Process the cancellation in the domain entity
    const { event } = reservation.cancel(reason)

    // Save the generated events
    await this.saveEvents(reservation.id, [event], reservation.version)

    // Clear domain events after persisting
    reservation.clearDomainEvents()

    return reservation
  }

  /**
   * Find active reservation by user and ISBN
   * This is needed for validation during reservation creation.
   *
   * @param userId User identifier
   * @param isbn Book ISBN
   * @returns Active reservation or null
   */
  async findActiveByUserAndIsbn(
    userId: string,
    isbn: string,
  ): Promise<Reservation | null> {
    try {
      const events = await this.collection
        .find({
          'payload.userId': userId,
          'payload.isbn': isbn,
          eventType: {
            $in: [
              RESERVATION_CREATED,
              RESERVATION_UPDATED,
              RESERVATION_STATUS_UPDATED,
            ],
          },
        })
        .sort({ timestamp: 1 })
        .toArray()

      if (events.length === 0) return null

      const eventsByAggregateId = this.groupEventsByAggregateId(events)

      // Find first active reservation
      for (const eventList of Object.values(eventsByAggregateId)) {
        const reservation = this.rehydrateFromEvents(eventList)

        if (reservation && this.isReservationActive(reservation)) {
          return reservation
        }
      }

      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      throw new Errors.ApplicationError(
        500,
        'RESERVATION_RETRIEVAL_FAILED',
        `Failed to retrieve active reservation for user ${userId} and book ${isbn}: ${message}`,
      )
    }
  }

  /**
   * Check if a reservation is active
   * @private
   */
  private isReservationActive(reservation: Reservation): boolean {
    return (
      reservation.status !== RESERVATION_STATUS.RETURNED &&
      reservation.status !== RESERVATION_STATUS.CANCELLED &&
      reservation.status !== RESERVATION_STATUS.BOUGHT
    )
  }

  /**
   * Find a reservation by its aggregate ID.
   * Retrieves all events for the aggregate and rehydrates the Reservation entity.
   *
   * @param aggregateId - The aggregate ID of the reservation
   * @returns The rehydrated reservation or null if not found
   */
  async findById(aggregateId: string): Promise<Reservation | null> {
    try {
      // Get all events for this aggregate ID
      const events = await this.getEventsForAggregate(aggregateId)

      if (events.length === 0) {
        return null
      }

      // Rehydrate the reservation from its events
      return this.rehydrateFromEvents(events)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      throw new Errors.ApplicationError(
        500,
        'RESERVATION_RETRIEVAL_FAILED',
        `Failed to retrieve reservation with ID ${aggregateId}: ${message}`,
      )
    }
  }
}
