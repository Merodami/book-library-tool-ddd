import { EventBus } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { UpdateBookCommand } from '@commands/UpdateBookCommand.js'
import { Book } from '@entities/Book.js'
import { IBookRepository } from '@repositories/IBookRepository.js'

export class UpdateBookHandler {
  constructor(
    private readonly repository: IBookRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Updates a Book by its unique identifier (ISBN) using the provided patch.
   * - Loads the existing Book aggregate by ISBN.
   * - Calls the update() method to get the updated aggregate and event.
   * - Persists the new event with optimistic concurrency.
   * - Publishes the event on the EventBus.
   *
   * @param command - The Book's unique identifier.
   * @returns The updated Book aggregate.
   */
  async execute(command: UpdateBookCommand): Promise<void> {
    const aggregateId = await this.repository.findAggregateIdByISBN(
      command.isbn,
    )

    if (!aggregateId) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with ISBN ${command.isbn} not found.`,
      )
    }

    const events = await this.repository.getEventsForAggregate(aggregateId)

    const currentBook = Book.rehydrate(events)

    const { event } = currentBook.update({
      title: command.title,
      author: command.author,
      publicationYear: command.publicationYear,
      publisher: command.publisher,
      price: command.price,
    })

    await this.repository.saveEvents(aggregateId, [event], currentBook.version)

    await this.eventBus.publish(event)

    currentBook.clearDomainEvents()
  }
}
