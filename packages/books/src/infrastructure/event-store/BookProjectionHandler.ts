import {
  BOOK_VALIDATION_RESULT,
  DomainEvent,
} from '@book-library-tool/event-store'
import { ErrorCode } from '@book-library-tool/shared'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'

/**
 * Event handler that maintains the read model for books in MongoDB.
 * This class is responsible for keeping the book projections in sync with domain events,
 * ensuring that the read model accurately reflects the current state of books in the system.
 */
export class BookProjectionHandler {
  constructor(private readonly repository: IBookProjectionRepository) {}

  /**
   * Handles the creation of a new book by inserting its projection into MongoDB.
   * This method is triggered when a BookCreated event is received.
   *
   * @param event - The domain event containing the book creation data
   */
  async handleBookCreated(event: DomainEvent): Promise<void> {
    await this.repository.saveProjection({
      id: event.aggregateId,
      isbn: event.payload.isbn,
      title: event.payload.title,
      author: event.payload.author,
      publicationYear: event.payload.publicationYear,
      publisher: event.payload.publisher,
      price: event.payload.price,
      version: event.version,
      updatedAt: new Date(event.timestamp),
    })
  }

  /**
   * Updates an existing book projection when changes are made to a book.
   * This method is triggered when a BookUpdated event is received.
   * Only updates fields that have actually changed in the event payload.
   *
   * @param event - The domain event containing the book update data
   */
  async handleBookUpdated(event: DomainEvent): Promise<void> {
    const updates: any = {}

    if (event.payload.updated.title) updates.title = event.payload.updated.title
    if (event.payload.updated.author)
      updates.author = event.payload.updated.author
    if (event.payload.updated.publicationYear)
      updates.publicationYear = event.payload.updated.publicationYear
    if (event.payload.updated.publisher)
      updates.publisher = event.payload.updated.publisher
    if (event.payload.updated.price) updates.price = event.payload.updated.price
    if (event.payload.updated.isbn) updates.isbn = event.payload.updated.isbn

    // Add updatedAt to the updates
    updates.updatedAt = new Date(event.timestamp)

    await this.repository.updateProjection(
      event.aggregateId,
      updates,
      event.version,
    )
  }

  /**
   * Handles the deletion of a book by marking it as deleted in the projection.
   * This method is triggered when a BookDeleted event is received.
   * Instead of removing the record, it sets a deletedAt timestamp for audit purposes.
   *
   * @param event - The domain event containing the book deletion data
   */
  async handleBookDeleted(event: DomainEvent): Promise<void> {
    await this.repository.markAsDeleted(
      event.aggregateId,
      event.version,
      new Date(event.timestamp),
    )
  }

  /**
   * Validates a book reservation request by checking if the book exists and is available.
   * This method is triggered when a reservation validation request is received.
   * Returns a validation result event indicating whether the reservation is valid.
   *
   * @param event - The domain event containing the reservation validation request
   * @returns A domain event containing the validation result
   */
  async handleReservationValidateBook(
    event: DomainEvent,
  ): Promise<DomainEvent> {
    // Extract information from the event
    const { reservationId, isbn } = event.payload

    // Check if the book exists in the projection table
    const book = await this.repository.findBookForReservation(isbn)

    // Create the validation result event
    const validationResultEvent: DomainEvent = {
      eventType: BOOK_VALIDATION_RESULT,
      aggregateId: isbn,
      payload: {
        reservationId: reservationId,
        isbn: isbn,
        isValid: !!book,
        reason: book ? null : ErrorCode.BOOK_NOT_FOUND,
        retailPrice: book ? book.price : null,
      },
      timestamp: new Date(),
      version: 1,
      schemaVersion: 1,
    }

    return validationResultEvent
  }
}
