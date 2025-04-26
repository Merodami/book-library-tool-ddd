import { type EventBusPort } from '@book-library-tool/event-store'
import { EventResponse } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { DeleteBookCommand } from '@books/application/index.js'
import type {
  BookReadRepositoryPort,
  BookWriteRepositoryPort,
} from '@books/domain/index.js'

export class DeleteBookHandler {
  constructor(
    private readonly readRepository: BookReadRepositoryPort,
    private readonly writeRepository: BookWriteRepositoryPort,
    private readonly eventBus: EventBusPort,
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
    // Load the aggregate's events and rehydrate its current state.
    const currentBook = await this.readRepository.getById(command.id)

    if (!currentBook) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${command.id} not found.`,
      )
    }

    if (currentBook.isDeleted()) {
      throw new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with ID ${command.id} already deleted.`,
      )
    }

    // Generate the delete event by invoking the domain's delete() method.
    const { event } = currentBook.delete()

    // Persist the new delete event with optimistic concurrency (expected version is the current one).
    await this.writeRepository.saveEvents(
      command.id,
      [event],
      currentBook.version,
    )

    // Publish the delete event.
    await this.eventBus.publish(event)

    currentBook.clearDomainEvents()

    return {
      success: true,
      bookId: command.id,
      version: currentBook.version,
    }
  }
}
