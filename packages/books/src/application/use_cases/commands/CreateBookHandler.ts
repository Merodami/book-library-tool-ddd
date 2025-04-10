import { Book } from '@entities/Book.js'
import { Errors } from '@book-library-tool/shared'
import type { CreateBookCommand } from '@commands/CreateBookCommand.js'
import type { EventBus } from '@book-library-tool/event-store'
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

  async execute(command: CreateBookCommand): Promise<void> {
    // Check for existing events (i.e. an existing aggregate) for the given ISBN.
    const existingEvents = await this.repository.getEventsForAggregate(
      command.isbn,
    )
    if (existingEvents && existingEvents.length > 0) {
      throw new Errors.ApplicationError(
        400,
        'BOOK_ALREADY_EXISTS',
        `Book with ISBN ${command.isbn} already exists.`,
      )
    }

    // Create the Book aggregate and capture the corresponding BookCreated event.
    const { book, event } = Book.create(command)

    // Persist the new event with the expected aggregate version (0 for new aggregates).
    await this.repository.saveEvents(book.isbn, [event], 0)

    // Publish the event so that any subscribers (e.g. projectors, integration handlers) are notified.
    await this.eventBus.publish(event)

    book.clearDomainEvents()
  }
}
