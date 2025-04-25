import { type EventBusPort } from '@book-library-tool/event-store'
import { EventResponse } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { CreateBookCommand } from '@books/application/index.js'
import type {
  BookReadProjectionRepositoryPort,
  BookWriteRepositoryPort,
} from '@books/domain/index.js'
import { Book } from '@books/domain/index.js'

/**
 * CreateBookHandler is responsible for processing a CreateBookCommand.
 * It performs a lookup to ensure the book does not already exist, creates the Book
 * (which produces a BookCreated event), and then persists and publishes that event.
 */
export class CreateBookHandler {
  constructor(
    private readonly writeRepository: BookWriteRepositoryPort,
    private readonly readProjectionRepository: BookReadProjectionRepositoryPort,
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(
    command: CreateBookCommand,
  ): Promise<EventResponse & { bookId: string }> {
    // Check if the book already exists in the projection.

    const existing = await this.readProjectionRepository.getBookByIsbn(
      command.isbn,
      undefined,
      true,
    )

    if (existing) {
      throw new Errors.ApplicationError(
        409,
        ErrorCode.BOOK_ALREADY_EXISTS,
        `Book with ISBN ${command.isbn} already exists`,
      )
    }

    // Create the Book aggregate and capture the corresponding BookCreated event.
    const { book, event } = Book.create(command)

    // Persist the new event with the expected aggregate version (0 for new aggregates).
    await this.writeRepository.saveEvents(book.id, [event], 0)

    // Publish the event so that any subscribers (e.g. projectors, integration handlers) are notified.
    await this.eventBus.publish(event)

    // Clear domain events after they've been persisted and published.
    book.clearDomainEvents()

    // Return the book entity.
    return {
      success: true,
      bookId: book.id,
      version: book.version,
    }
  }
}
