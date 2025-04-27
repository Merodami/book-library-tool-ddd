import {
  MongoDatabaseService,
  MongoWriteRepository,
} from '@book-library-tool/database'
import type { DomainEvent } from '@book-library-tool/shared'
import { logger } from '@book-library-tool/shared'
import { Reservation } from '@reservations/domain/entities/Reservation.js'
import { Collection } from 'mongodb'
import { ReservationWriteRepositoryPort } from 'src/domain/port/index.js'

/**
 * Event-sourced repository implementation for Reservation aggregates.
 * Handles persisting and retrieving domain events for the reservation bounded context.
 */
export class ReservationWriteRepository
  extends MongoWriteRepository<Reservation>
  implements ReservationWriteRepositoryPort
{
  constructor(
    protected readonly collection: Collection<DomainEvent>,
    protected readonly dbService: MongoDatabaseService,
  ) {
    super(collection, dbService)
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
      logger.error('Failed to rehydrate reservation:', error)

      return null
    }
  }
}
