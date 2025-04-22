import {
  BOOK_VALIDATION_RESULT,
  DomainEvent,
} from '@book-library-tool/event-store'
import { ErrorCode } from '@book-library-tool/shared'
import { IBookReadProjectionRepository } from '@books/repositories/IBookReadProjectionRepository.js'

/**
 * Event handler that maintains the read model for books in MongoDB.
 * This class is responsible for keeping the book projections in sync with domain events,
 * ensuring that the read model accurately reflects the current state of books in the system.
 */
export class BookReadProjectionHandler {
  constructor(
    private readonly projectionReadRepository: IBookReadProjectionRepository,
  ) {}

  /**
   * Validates a book reservation request by checking if the book exists and is available.
   * This method is triggered when a reservation validation request is received.
   * Returns a validation result event indicating whether the reservation is valid.
   *
   * @param event - The domain event containing the reservation validation request
   * @returns A domain event containing the validation result
   */
  async handleValidateBook(event: DomainEvent): Promise<DomainEvent> {
    // Extract information from the event
    const { reservationId, bookId } = event.payload

    // Check if the book exists in the projection table
    const book = await this.projectionReadRepository.getBookById(bookId)

    // Create the validation result event
    const validationResultEvent: DomainEvent = {
      eventType: BOOK_VALIDATION_RESULT,
      aggregateId: bookId,
      version: 1,
      schemaVersion: 1,
      timestamp: new Date(),
      payload: {
        reservationId,
        bookId,
        isValid: !!book,
        reason: book ? null : ErrorCode.BOOK_NOT_FOUND,
        retailPrice: book ? book.price : null,
      },
    }

    return validationResultEvent
  }
}
