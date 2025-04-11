import { MongoDatabaseService } from '@book-library-tool/database'
import {
  DomainEvent,
  RESERVATION_CANCELLED,
  RESERVATION_OVERDUE,
  RESERVATION_RETURNED,
} from '@book-library-tool/event-store'
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
      status: RESERVATION_STATUS.CREATED,
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
          status: RESERVATION_RETURNED,
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
          status: RESERVATION_CANCELLED,
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
          status: RESERVATION_OVERDUE,
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
    const { reservationId, isValid, reason, retailPrice } = event.payload

    // Update object with the basic fields
    const updateData: any = {
      status: isValid
        ? RESERVATION_STATUS.PENDING_PAYMENT
        : RESERVATION_STATUS.REJECTED,
      statusReason: isValid ? null : reason,
      updatedAt: new Date(),
    }

    // If retail price is provided, add it to the update
    if (retailPrice !== undefined && retailPrice > 0) {
      updateData.retailPrice = Number(retailPrice)
      logger.debug(
        `Setting retail price for reservation ${reservationId} to ${retailPrice}`,
      )
    }

    // Update the reservation status in the projection
    await this.db
      .getCollection(RESERVATION_PROJECTION_TABLE)
      .updateOne({ id: reservationId }, { $set: updateData })

    logger.info(
      `Reservation ${reservationId} validation result: ${isValid ? 'confirmed' : 'rejected'}`,
    )
  }

  /**
   * Handles the ReservationPaymentReceived event by updating the reservation status to 'confirmed'.
   * Records the payment information and updates the reservation status.
   *
   * @param event - The ReservationPaymentReceived domain event
   */
  async handlePaymentSuccess(event: DomainEvent): Promise<void> {
    const paymentDate = new Date(event.timestamp)

    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateOne(
      {
        id: event.aggregateId,
        version: { $lt: event.version },
      },
      {
        $set: {
          status: RESERVATION_STATUS.RESERVED,
          paymentReceived: true,
          paymentAmount: event.payload.amount,
          paymentDate: paymentDate,
          paymentMethod: event.payload.paymentMethod,
          paymentReference: event.payload.paymentReference,
          version: event.version,
          updatedAt: new Date(event.timestamp),
        },
      },
    )

    logger.info(
      `Payment received for reservation ${event.aggregateId}. Status updated to confirmed.`,
    )
  }

  async handlePaymentDeclined(event: DomainEvent): Promise<void> {
    const paymentDate = new Date(event.timestamp)

    logger.debug(
      `Processing payment declined event for reservation ${event.aggregateId}`,
    )

    const result = await this.db
      .getCollection(RESERVATION_PROJECTION_TABLE)
      .updateOne(
        {
          id: event.aggregateId,
          // Remove the version check as this event is from a different stream
        },
        {
          $set: {
            status: RESERVATION_STATUS.REJECTED,
            paymentReceived: false, // This should be false for declined payments
            paymentFailed: true,
            paymentFailReason: event.payload.reason,
            paymentAttemptDate: paymentDate,
            updatedAt: new Date(event.timestamp),
          },
        },
      )

    if (result.matchedCount === 0) {
      logger.warn(
        `No reservation found with ID ${event.aggregateId} to update payment declined status`,
      )
      return
    }

    logger.info(
      `Payment declined for reservation ${event.aggregateId}. Status updated to rejected. Reason: ${event.payload.reason}`,
    )
  }

  async handleRetailPriceUpdated(event: DomainEvent): Promise<void> {
    await this.db.getCollection(RESERVATION_PROJECTION_TABLE).updateOne(
      { id: event.aggregateId },
      {
        $set: {
          retailPrice: Number(event.payload.newRetailPrice),
          updatedAt: new Date(event.timestamp),
        },
      },
    )
  }
}
