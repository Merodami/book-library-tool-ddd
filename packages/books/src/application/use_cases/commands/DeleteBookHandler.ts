import { EventBus } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { Book } from '@entities/Book.js'
import { IBookRepository } from '@repositories/IBookRepository.js'

import { DeleteBookCommand } from './DeleteBookCommand.js'

export class DeleteBookHandler {
  constructor(
    private readonly bookRepository: IBookRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Deletes a Book by its unique identifier by rehydrating the aggregate,
   * generating a BookDeleted event, persisting it, and publishing it.
   *
   * @param isbn - The Book's unique identifier.
   * @returns True if deletion succeeded.
   */
  async execute(command: DeleteBookCommand): Promise<boolean> {
    const aggregateId = await this.bookRepository.findAggregateIdByISBN(
      command.isbn,
    )

    if (!aggregateId) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${command.isbn} not found.`,
      )
    }

    // Load the aggregate's events and rehydrate its current state.
    const events = await this.bookRepository.getEventsForAggregate(aggregateId)

    if (!events || events.length === 0) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${command.isbn} not found.`,
      )
    }

    const currentBook = Book.rehydrate(events)

    if (currentBook.isDeleted()) {
      throw new Errors.ApplicationError(
        410,
        'BOOK_ALREADY_DELETED',
        `Book with isbn ${command.isbn} already deleted.`,
      )
    }

    // Generate the delete event by invoking the domain's delete() method.
    const { event } = currentBook.delete()

    // Persist the new delete event with optimistic concurrency (expected version is the current one).
    await this.bookRepository.saveEvents(
      aggregateId,
      [event],
      currentBook.version,
    )

    // Publish the delete event.
    await this.eventBus.publish(event)

    currentBook.clearDomainEvents()

    return true
  }
}
