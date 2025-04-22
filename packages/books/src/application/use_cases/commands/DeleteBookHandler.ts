import { EventBus } from '@book-library-tool/event-store'
import { EventResponse } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { Book } from '@books/entities/Book.js'
import { IBookReadRepository } from '@books/repositories/IBookReadRepository.js'
import { IBookWriteRepository } from '@books/repositories/IBookWriteRepository.js'

import { DeleteBookCommand } from './DeleteBookCommand.js'

export class DeleteBookHandler {
  constructor(
    private readonly readRepository: IBookReadRepository,
    private readonly writeRepository: IBookWriteRepository,
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
    const aggregateId = await this.readRepository.findAggregateIdById(
      command.id,
    )

    if (!aggregateId) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with id ${command.id} not found.`,
      )
    }

    // Load the aggregate's events and rehydrate its current state.
    const events = await this.writeRepository.getEventsForAggregate(aggregateId)

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
    await this.writeRepository.saveEvents(
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
