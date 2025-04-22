import {
  BaseWriteEventSourcedRepository,
  type DomainEvent,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { Reservation } from '@reservations/entities/Reservation.js'
import type { IReservationWriteRepository } from '@reservations/repositories/IReservationWriteRepository.js'

/**
 * Event-sourced repository implementation for Reservation aggregates.
 * Handles persisting and retrieving domain events for the reservation bounded context.
 */
export class ReservationWriteRepository
  extends BaseWriteEventSourcedRepository<Reservation>
  implements IReservationWriteRepository
{
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
}
