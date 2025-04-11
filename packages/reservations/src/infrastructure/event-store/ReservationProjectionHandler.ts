import { MongoDatabaseService } from '@book-library-tool/database'
import { DomainEvent } from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'

const RESERVATION_PROJECTION_TABLE = 'reservation_projection'

/**
 * Projection handler for reservation events.
 * Responsible for maintaining the read model of reservations based on domain events.
 * This class focuses on updating the denormalized view model used for queries.
 */
export class ReservationProjectionHandler {
  constructor(private readonly db: MongoDatabaseService) {}

  /**
   * Handles the ReservationCreated event by creating a new reservation projection.
   *
   * @param event - The ReservationCreated domain event
   */
  async handleReservationCreated(event: DomainEvent): Promise<void> {
    // Calculate the due date (typically 14 days from creation)
    const createdDate = new Date(event.timestamp)
    const dueDate = new Date(createdDate)
    dueDate.setDate(createdDate.getDate() + 14) // 2 weeks loan period

    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).insertOne({
      id: event.aggregateId,
      userId: event.payload.userId,
      isbn: event.payload.isbn,
      status: RESERVATION_STATUS.CONFIRMED,
      createdAt: createdDate,
      dueDate: dueDate,
      returnedAt: null,
      lateFee: 0,
      version: event.version,
      updatedAt: new Date(event.timestamp),
    })
  }

  /**
   * Handles the ReservationReturned event by updating the reservation status to 'returned'.
   * Also records the return date and any late fees.
   *
   * @param event - The ReservationReturned domain event
   */
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

  /**
   * Handles the ReservationCancelled event by updating the reservation status to 'cancelled'.
   * Records the cancellation date and reason.
   *
   * @param event - The ReservationCancelled domain event
   */
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

  /**
   * Handles the ReservationOverdue event by marking the reservation as 'overdue'.
   * Records when the reservation became overdue.
   *
   * @param event - The ReservationOverdue domain event
   */
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

  /**
   * Handles the ReservationDeleted event by marking the reservation as deleted.
   * This is typically a soft delete that preserves the record but marks it as removed.
   *
   * @param event - The ReservationDeleted domain event
   */
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

  /**
   * Handles the BookDetailsUpdated event from the Books service.
   * Updates all reservations that reference the updated book.
   *
   * @param event - The BookDetailsUpdated domain event
   */
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

  /**
   * Handles the BookDeleted event from the Books service.
   * Marks affected reservations to indicate the book has been deleted.
   *
   * @param event - The BookDeleted domain event
   */
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

  /**
   * Handles the BookValidationResult event from the Books service.
   * Updates the reservation status based on the book validation result.
   * Part of the eventual consistency pattern where book existence is validated asynchronously.
   *
   * @param event - The BookValidationResult domain event
   */
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
