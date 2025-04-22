import {
  BaseReadEventSourcedRepository,
  type DomainEvent,
  RESERVATION_CONFIRMED,
} from '@book-library-tool/event-store'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Reservation } from '@reservations/entities/Reservation.js'
import type { IReservationReadRepository } from '@reservations/repositories/IReservationReadRepository.js'

/**
 * Event-sourced repository implementation for Reservation aggregates.
 * Handles persisting and retrieving domain events for the reservation bounded context.
 */
export class ReservationReadRepository
  extends BaseReadEventSourcedRepository<Reservation>
  implements IReservationReadRepository
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
   * Find active reservation by user and Book ID
   * This is needed for validation during reservation creation.
   *
   * @param userId User identifier
   * @param bookId Book ID
   * @returns Active reservation or null
   */
  async findActiveByUserAndBookId(
    userId: string,
    bookId: string,
  ): Promise<Reservation | null> {
    try {
      const events = await this.collection
        .find({
          'payload.userId': userId,
          'payload.bookId': bookId,
          eventType: {
            $in: [RESERVATION_CONFIRMED],
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
        ErrorCode.RESERVATION_RETRIEVAL_FAILED,
        `Failed to retrieve active reservation for user ${userId} and book ${bookId}: ${message}`,
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
      reservation.status !== RESERVATION_STATUS.BROUGHT
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
        ErrorCode.RESERVATION_RETRIEVAL_FAILED,
        `Failed to retrieve reservation with ID ${aggregateId}: ${message}`,
      )
    }
  }
}
