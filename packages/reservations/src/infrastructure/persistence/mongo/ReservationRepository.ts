import { DomainEvent } from '@book-library-tool/event-store'
import { Reservation } from '@entities/Reservation.js'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { Errors } from '@book-library-tool/shared'
import { IReservationRepositoryEvent } from '@repositories/IReservationRepositoryEvent.js'
import { BaseEventSourcedRepository } from './BaseEventSourcedRepository.js'

export class ReservationRepository
  extends BaseEventSourcedRepository<Reservation>
  implements IReservationRepositoryEvent
{
  /**
   * Create reservation-specific indexes
   * @protected
   */
  protected async createEntitySpecificIndexes(): Promise<void> {
    await this.collection.createIndex(
      { 'payload.userId': 1 },
      { background: true },
    )

    await this.collection.createIndex(
      { 'payload.userId': 1, 'payload.isbn': 1 },
      { background: true },
    )
  }

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
      console.error('Failed to rehydrate reservation:', error)
      return null
    }
  }

  /**
   * Find all reservations for a user
   * @param userId User identifier
   * @returns Array of reservations
   */
  async findByUserId(userId: string): Promise<Reservation[]> {
    if (!userId) {
      throw new Errors.ApplicationError(
        400,
        'INVALID_USER_ID',
        'User ID is required',
      )
    }

    try {
      // Query for reservation-related events
      const events = await this.collection
        .find({
          'payload.userId': userId,
          eventType: {
            $in: [
              'ReservationCreated',
              'ReservationUpdated',
              'ReservationStatusChanged',
              'ReservationCancelled',
              'ReservationReturned',
            ],
          },
        })
        .sort({ timestamp: 1 })
        .toArray()

      // Group and rehydrate
      const eventsByAggregateId = this.groupEventsByAggregateId(events)

      return Object.values(eventsByAggregateId)
        .map((eventGroup) => this.rehydrateFromEvents(eventGroup))
        .filter(Boolean) as Reservation[]
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Errors.ApplicationError(
        500,
        'RESERVATION_RETRIEVAL_FAILED',
        `Failed to retrieve reservations for user ${userId}: ${message}`,
      )
    }
  }

  /**
   * Find active reservation by user and ISBN
   * @param userId User identifier
   * @param isbn Book ISBN
   * @returns Active reservation or null
   */
  async findActiveByUserAndIsbn(
    userId: string,
    isbn: string,
  ): Promise<Reservation | null> {
    if (!userId || !isbn) {
      throw new Errors.ApplicationError(
        400,
        'INVALID_PARAMETERS',
        'Both userId and ISBN are required',
      )
    }

    try {
      const events = await this.collection
        .find({
          'payload.userId': userId,
          'payload.isbn': isbn,
          eventType: {
            $in: [
              'ReservationCreated',
              'ReservationUpdated',
              'ReservationStatusChanged',
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
}
