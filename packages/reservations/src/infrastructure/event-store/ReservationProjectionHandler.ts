import { MongoDatabaseService } from '@book-library-tool/database'
import { DomainEvent } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'

const RESERVATION_PROJECTION_TABLE = 'reservation_projection'

export class ReservationProjectionHandler {
  constructor(private readonly db: MongoDatabaseService) {}

  async handleReservationCreated(event: DomainEvent): Promise<void> {
    // Calculate the due date (typically 14 days from creation)
    const createdDate = new Date(event.timestamp)
    const dueDate = new Date(createdDate)
    dueDate.setDate(createdDate.getDate() + 14) // 2 weeks loan period

    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).insertOne({
      id: event.aggregateId,
      userId: event.payload.userId,
      isbn: event.payload.isbn,
      status: 'active',
      createdAt: createdDate,
      dueDate: dueDate,
      returnedAt: null,
      lateFee: 0,
      version: event.version,
      updatedAt: new Date(event.timestamp),
    })
  }

  async handleReservationReturned(event: DomainEvent): Promise<void> {
    const returnedDate = new Date(event.timestamp)

    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateOne(
      {
        id: event.aggregateId,
        version: { $lt: event.version },
      },
      {
        $set: {
          status: 'returned',
          returnedAt: returnedDate,
          lateFee: event.payload.lateFee || 0,
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }

  async handleReservationCancelled(event: DomainEvent): Promise<void> {
    const cancelledDate = new Date(event.timestamp)

    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateOne(
      {
        id: event.aggregateId,
        version: { $lt: event.version },
      },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: cancelledDate,
          cancellationReason: event.payload.reason,
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }

  async handleReservationOverdue(event: DomainEvent): Promise<void> {
    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateOne(
      {
        id: event.aggregateId,
        version: { $lt: event.version },
      },
      {
        $set: {
          status: 'overdue',
          overdueAt: new Date(event.timestamp),
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }

  async handleReservationDeleted(event: DomainEvent): Promise<void> {
    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateOne(
      { id: event.aggregateId },
      {
        $set: {
          version: event.version,
          deletedAt: new Date(),
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }

  // External event handlers for cross-service events

  async handleBookDetailsUpdated(event: DomainEvent): Promise<void> {
    // When a book's details are updated, we need to update all reservations that reference it
    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateMany(
      { isbn: event.payload.isbn, deletedAt: null },
      {
        $set: {
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }

  async handleBookDeleted(event: DomainEvent): Promise<void> {
    // When a book is deleted, we could mark affected reservations or add a note
    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateMany(
      { isbn: event.payload.isbn, status: 'active', deletedAt: null },
      {
        $set: {
          bookDeleted: true,
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }

  async handleBookValidationResult(event: DomainEvent): Promise<void> {
    // Get the reservation ID and validation result from the event
    const { reservationId, isValid, reason } = event.payload

    // Update the reservation status in the projection
    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateOne(
      { id: reservationId },
      {
        $set: {
          status: isValid
            ? RESERVATION_STATUS.CONFIRMED
            : RESERVATION_STATUS.REJECTED,
          statusReason: isValid ? null : reason,
          updatedAt: new Date(),
        },
      },
    )

    logger.info(
      `Reservation ${reservationId} validation result: ${isValid ? 'confirmed' : 'rejected'}`,
    )
  }
}
