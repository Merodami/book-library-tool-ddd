// packages/books/src/application/handlers/UpdateBookHandler.ts

import { Book } from '@entities/Book.js'
import { Errors } from '@book-library-tool/shared'
import type { EventBus } from '@book-library-tool/event-store'
import type { IBookRepositoryEvent } from '../../domain/repositories/IBookRepositoryEvent.js'
import { UpdateBookCommand } from '../commands/UpdateBookCommand.js'

/**
 * UpdateBookHandler
 * 1. Loads the existing book aggregate by ISBN
 * 2. Calls Book.update() to get the updated aggregate + BookUpdated event
 * 3. Persists the new event with optimistic‑concurrency
 * 4. Publishes the event on the EventBus
 */
export class UpdateBookHandler {
  constructor(
    private readonly repository: IBookRepositoryEvent,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateBookCommand): Promise<void> {
    const events = await this.repository.getEventsForAggregate(command.isbn)

    if (!events || events.length === 0) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with ISBN ${command.isbn} not found.`,
      )
    }

    const currentBook = Book.rehydrate(events)

    const { book: updatedBook, event } = currentBook.update({
      title: command.title,
      author: command.author,
      publicationYear: command.publicationYear,
      publisher: command.publisher,
      price: command.price,
    })

    await this.repository.saveEvents(
      updatedBook.isbn,
      [event],
      currentBook.version,
    )

    await this.eventBus.publish(event)
  }
}
