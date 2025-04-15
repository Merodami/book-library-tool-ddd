import type { EventBus } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { ErrorCode } from '@book-library-tool/shared/src/errorCodes.js'
import type { CreateBookCommand } from '@commands/CreateBookCommand.js'
import { Book } from '@entities/Book.js'
import type { IBookRepository } from '@repositories/IBookRepository.js'

/**
 * CreateBookHandler is responsible for processing a CreateBookCommand.
 * It performs a lookup to ensure the book does not already exist, creates the Book
 * (which produces a BookCreated event), and then persists and publishes that event.
 */
export class CreateBookHandler {
  constructor(
    private readonly repository: IBookRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateBookCommand): Promise<Book> {
    // Check for existing events (i.e. an existing aggregate) for the given ISBN.
    const aggregateId = await this.repository.findAggregateIdByISBN(
      command.isbn,
    )

    if (aggregateId) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.BOOK_ALREADY_EXISTS,
        `Book with ISBN ${command.isbn} already exists.`,
      )
    }

    // Create the Book aggregate and capture the corresponding BookCreated event.
    const { book, event } = Book.create(command)

    // Persist the new event with the expected aggregate version (0 for new aggregates).
    await this.repository.saveEvents(book.id, [event], 0)

    // Publish the event so that any subscribers (e.g. projectors, integration handlers) are notified.
    await this.eventBus.publish(event)

    // Clear domain events after they've been persisted and published.
    book.clearDomainEvents()

    // Return the book entity.
    return book
  }
}
