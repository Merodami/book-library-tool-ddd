import { EventBus } from '@book-library-tool/event-store'
import { EventResponse } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Book } from '@books/entities/Book.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { IBookRepository } from '@books/repositories/IBookRepository.js'

import { DeleteBookCommand } from './DeleteBookCommand.js'

export class DeleteBookHandler {
  constructor(
    private readonly bookRepository: IBookRepository,
    private readonly projectionRepository: IBookProjectionRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Deletes a Book by its unique identifier by rehydrating the aggregate,
   * generating a BookDeleted event, persisting it, and publishing it.
   *
   * @param isbn - The Book's unique identifier.
   * @returns True if deletion succeeded.
   */
  async execute(
    command: DeleteBookCommand,
  ): Promise<EventResponse & { bookId: string }> {
    const existing = await this.projectionRepository.getBookById(command.id)

    if (!existing || !existing.id) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${command.id} not found`,
      )
    }

    const aggregateId = existing.id

    // Load the aggregate's events and rehydrate its current state.
    const events = await this.bookRepository.getEventsForAggregate(aggregateId)

    if (!events || events.length === 0) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with id ${command.id} not found.`,
      )
    }

    const currentBook = Book.rehydrate(events)

    if (currentBook.isDeleted()) {
      throw new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with id ${command.id} already deleted.`,
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

    return {
      success: true,
      bookId: aggregateId,
      version: currentBook.version,
    }
  }
}
