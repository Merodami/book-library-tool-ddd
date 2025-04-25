import type { DomainEvent } from '@book-library-tool/event-store'
import type { IBookWriteProjectionRepository } from '@books/domain/index.js'

/**
 * Event handler that maintains the write model for books in MongoDB.
 * This class is responsible for keeping the book projections in sync with domain events,
 * ensuring that the write model accurately reflects the current state of books in the system.
 */
export class BookWriteProjectionHandler {
  constructor(
    private readonly projectionWriteRepository: IBookWriteProjectionRepository,
  ) {}

  /**
   * Handles the creation of a new book by inserting its projection into MongoDB.
   * This method is triggered when a BookCreated event is received.
   *
   * @param event - The domain event containing the book creation data
   */
  async handleBookCreated(event: DomainEvent): Promise<void> {
    await this.projectionWriteRepository.saveBookProjection({
      id: event.payload.id,
      isbn: event.payload.isbn,
      title: event.payload.title,
      author: event.payload.author,
      publicationYear: event.payload.publicationYear,
      publisher: event.payload.publisher,
      price: event.payload.price,
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

    if (event.payload.updated.title) {
      updates.title = event.payload.updated.title
    }

    if (event.payload.updated.author) {
      updates.author = event.payload.updated.author
    }

    if (event.payload.updated.publicationYear) {
      updates.publicationYear = event.payload.updated.publicationYear
    }

    if (event.payload.updated.publisher) {
      updates.publisher = event.payload.updated.publisher
    }

    if (event.payload.updated.price) {
      updates.price = event.payload.updated.price
    }

    if (event.payload.updated.isbn) {
      updates.isbn = event.payload.updated.isbn
    }

    // Add updatedAt to the updates
    updates.updatedAt = event.timestamp

    await this.projectionWriteRepository.updateBookProjection(
      event.aggregateId,
      updates,
      event.timestamp,
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
    await this.projectionWriteRepository.markAsDeleted(
      event.aggregateId,
      event.timestamp,
    )
  }
}
