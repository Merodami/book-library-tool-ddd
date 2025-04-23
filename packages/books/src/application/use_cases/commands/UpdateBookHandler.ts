import { EventResponse } from '@book-library-tool/api/src/schemas/events.js'
import { EventBus } from '@book-library-tool/event-store'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { UpdateBookCommand } from '@books/commands/UpdateBookCommand.js'
import { Book } from '@books/entities/Book.js'
import { IBookWriteRepository } from '@books/repositories/IBookWriteRepository.js'

export class UpdateBookHandler {
  constructor(
    private readonly writeRepository: IBookWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Updates a Book by its unique identifier (ID) using the provided patch.
   * - Loads the existing Book aggregate by ID.
   * - Calls the update() method to get the updated aggregate and event.
   * - Persists the new event with optimistic concurrency.
   * - Publishes the event on the EventBus.
   *
   * @param command - The Book's unique identifier.
   * @returns The updated Book aggregate.
   */
  async execute(
    command: UpdateBookCommand,
  ): Promise<EventResponse & { bookId: string }> {
    const events = await this.writeRepository.getEventsForAggregate(command.id)

    if (events.length === 0) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${command.id} not found.`,
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

    await this.writeRepository.saveEvents(
      command.id,
      [event],
      currentBook.version,
    )

    await this.eventBus.publish(event)

    updatedBook.clearDomainEvents()

    return {
      success: true,
      bookId: updatedBook.id,
      version: updatedBook.version,
    }
  }
}
