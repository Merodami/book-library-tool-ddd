import {
  DomainEvent,
  RESERVATION_CANCELLED,
  RESERVATION_OVERDUE,
  RESERVATION_RETURNED,
} from '@book-library-tool/event-store'
import { logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { IReservationProjectionRepository } from '@reservations/repositories/IReservationProjectionRepository.js'

/**
 * Projection handler for reservation events.
 * This class maintains the read model of reservations by processing domain events
 * and updating a denormalized projection collection. It implements the CQRS pattern's
 * read model, providing efficient query capabilities for reservation data.
 *
 * The handler processes both internal reservation events and cross-domain events
 * from the books and wallet contexts, ensuring eventual consistency across
 * bounded contexts.
 */
export class ReservationProjectionHandler {
  constructor(private readonly repository: IReservationProjectionRepository) {}

  /**
   * Handles the ReservationCreated event by creating a new reservation projection.
   * Sets up the initial reservation state including:
   * - User and book information
   * - Due date (14 days from creation)
   * - Initial status and timestamps
   *
   * @param event - The ReservationCreated domain event
   */
  async handleReservationCreated(event: DomainEvent): Promise<void> {
    // Calculate the due date (typically 14 days from creation)
    const createdDate = new Date(event.timestamp)
    const dueDate = new Date(createdDate)
    dueDate.setDate(createdDate.getDate() + 14) // 2 weeks loan period

    await this.repository.saveReservation({
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
   * Records the return date and any late fees that were applied.
   * This update is version-aware to prevent race conditions.
   *
   * @param event - The ReservationReturned domain event
   */
  async handleReservationReturned(event: DomainEvent): Promise<void> {
    const returnedDate = new Date(event.timestamp)

    await this.repository.updateReservationReturned(
      event.aggregateId,
      {
        status: RESERVATION_RETURNED,
        returnedAt: returnedDate,
        lateFee: event.payload.lateFee || 0,
        version: event.version,
        updatedAt: new Date(event.timestamp),
      },
      event.version,
    )
  }

  /**
   * Handles the ReservationCancelled event by updating the reservation status to 'cancelled'.
   * Records the cancellation date and reason, maintaining an audit trail of the cancellation.
   * This update is version-aware to prevent race conditions.
   *
   * @param event - The ReservationCancelled domain event
   */
  async handleReservationCancelled(event: DomainEvent): Promise<void> {
    const cancelledDate = new Date(event.timestamp)

    await this.repository.updateReservationCancelled(
      event.aggregateId,
      {
        status: RESERVATION_CANCELLED,
        cancelledAt: cancelledDate,
        cancellationReason: event.payload.reason,
        version: event.version,
        updatedAt: new Date(event.timestamp),
      },
      event.version,
    )
  }

  /**
   * Handles the ReservationOverdue event by marking the reservation as 'overdue'.
   * Records when the reservation became overdue and updates the status accordingly.
   * This update is version-aware to prevent race conditions.
   *
   * @param event - The ReservationOverdue domain event
   */
  async handleReservationOverdue(event: DomainEvent): Promise<void> {
    await this.repository.updateReservationOverdue(
      event.aggregateId,
      {
        status: RESERVATION_OVERDUE,
        overdueAt: new Date(event.timestamp),
        version: event.version,
        updatedAt: new Date(event.timestamp),
      },
      event.version,
    )
  }

  /**
   * Handles the ReservationDeleted event by marking the reservation as deleted.
   * Implements a soft delete pattern that preserves the record for audit purposes
   * while marking it as removed from active use.
   *
   * @param event - The ReservationDeleted domain event
   */
  async handleReservationDeleted(event: DomainEvent): Promise<void> {
    await this.repository.markReservationAsDeleted(
      event.aggregateId,
      event.version,
      new Date(event.timestamp),
    )
  }

  /**
   * Handles the BookDetailsUpdated event from the Books service.
   * Updates all active reservations that reference the updated book.
   * This ensures the read model stays in sync with book information changes.
   *
   * @param event - The BookDetailsUpdated domain event
   */
  async handleBookDetailsUpdated(event: DomainEvent): Promise<void> {
    await this.repository.updateReservationsForBookUpdate(
      event.payload.isbn,
      new Date(event.timestamp),
    )
  }

  /**
   * Handles the BookDeleted event from the Books service.
   * Marks affected active reservations to indicate the book has been deleted.
   * This helps maintain data consistency across bounded contexts.
   *
   * @param event - The BookDeleted domain event
   */
  async handleBookDeleted(event: DomainEvent): Promise<void> {
    await this.repository.markReservationsForDeletedBook(
      event.payload.isbn,
      new Date(event.timestamp),
    )
  }

  /**
   * Handles the BookValidationResult event from the Books service.
   * Updates the reservation status based on the book validation result.
   * This is part of the eventual consistency pattern where book existence
   * is validated asynchronously.
   *
   * @param event - The BookValidationResult domain event
   */
  async handleBookValidationResult(event: DomainEvent): Promise<void> {
    const { reservationId, isValid, reason, retailPrice } = event.payload

    const updateData: any = {
      status: isValid
        ? RESERVATION_STATUS.PENDING_PAYMENT
        : RESERVATION_STATUS.REJECTED,
      statusReason: isValid ? null : reason,
      updatedAt: new Date(),
    }

    if (retailPrice !== undefined && retailPrice > 0) {
      updateData.retailPrice = Number(retailPrice)
      logger.debug(
        `Setting retail price for reservation ${reservationId} to ${retailPrice}`,
      )
    }

    await this.repository.updateReservationValidationResult(
      reservationId,
      updateData,
    )

    logger.info(
      `Reservation ${reservationId} validation result: ${isValid ? 'confirmed' : 'rejected'}`,
    )
  }

  /**
   * Handles successful payment events from the wallet context.
   * Updates the reservation status to 'reserved' and records payment details.
   * This update is version-aware to prevent race conditions.
   *
   * @param event - The payment success domain event
   */
  async handlePaymentSuccess(event: DomainEvent): Promise<void> {
    const paymentDate = new Date(event.timestamp)

    await this.repository.updateReservationPaymentSuccess(
      event.aggregateId,
      {
        status: RESERVATION_STATUS.RESERVED,
        paymentReceived: true,
        paymentAmount: event.payload.amount,
        paymentDate: paymentDate,
        paymentMethod: event.payload.paymentMethod,
        paymentReference: event.payload.paymentReference,
        version: event.version,
        updatedAt: new Date(event.timestamp),
      },
      event.version,
    )

    logger.info(
      `Payment received for reservation ${event.aggregateId}. Status updated to confirmed.`,
    )
  }

  /**
   * Handles declined payment events from the wallet context.
   * Updates the reservation status to 'rejected' and records payment failure details.
   * This helps track payment attempts and their outcomes.
   *
   * @param event - The payment declined domain event
   */
  async handlePaymentDeclined(event: DomainEvent): Promise<void> {
    const paymentDate = new Date(event.timestamp)

    logger.debug(
      `Processing payment declined event for reservation ${event.aggregateId}`,
    )

    const result = await this.repository.updateReservationPaymentDeclined(
      event.aggregateId,
      {
        status: RESERVATION_STATUS.REJECTED,
        paymentReceived: false,
        paymentFailed: true,
        paymentFailReason: event.payload.reason,
        paymentAttemptDate: paymentDate,
        updatedAt: new Date(event.timestamp),
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

  /**
   * Handles retail price updates for reservations.
   * Updates the price information in the reservation projection when
   * the book's retail price changes.
   *
   * @param event - The retail price update domain event
   */
  async handleRetailPriceUpdated(event: DomainEvent): Promise<void> {
    await this.repository.updateReservationRetailPrice(
      event.aggregateId,
      Number(event.payload.newRetailPrice),
      new Date(event.timestamp),
    )
  }

  /**
   * Handles the ReservationBookBrought event.
   * Updates the reservation status to 'brought' when a book is returned
   * to the library. This marks the completion of the reservation lifecycle.
   *
   * @param event - The book brought domain event
   */
  async handleReservationBookBrought(event: DomainEvent): Promise<void> {
    await this.repository.updateReservationBookBrought(
      event.aggregateId,
      event.version,
      new Date(event.timestamp),
    )

    logger.info(`Reservation ${event.payload.reservationId} marked as brought`)
  }
}
