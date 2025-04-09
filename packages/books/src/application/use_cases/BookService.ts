import { BookCreateRequest, BookUpdateRequest } from '@book-library-tool/sdk'
import { Errors } from '@book-library-tool/shared'
import { Book } from '@entities/Book.js'
import { IBookRepository } from '@repositories/IBookRepository.js'
import { EventBus } from '@book-library-tool/event-store'

export class BookService {
  constructor(
    private readonly bookRepository: IBookRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Creates a new Book using event-sourced domain rules.
   * - Checks if the Book already exists (by retrieving its events).
   * - Generates a BookCreated event using the domain entity.
   * - Persists the event (expected version 0 for a new aggregate) and publishes it.
   *
   * @param data - Object containing book details.
   * @returns The newly created Book aggregate (rehydrated from its events).
   */
  async createBook(data: BookCreateRequest): Promise<Book> {
    // Check if events already exist for this ISBN to detect an existing aggregate.
    const existingEvents = await this.bookRepository.getEventsForAggregate(
      data.isbn,
    )

    if (existingEvents && existingEvents.length > 0) {
      throw new Errors.ApplicationError(
        400,
        'BOOK_ALREADY_EXISTS',
        `Book with isbn ${data.isbn} already exists.`,
      )
    }

    // Create the Book aggregate which returns both the new aggregate and a BookCreated event.
    const { book, event } = Book.create(data)

    // Persist the event with expected version 0 since this is a new aggregate.
    await this.bookRepository.saveEvents(book.isbn, [event], 0)

    // Publish the event so that any subscribers (e.g., projectors/read-model updaters) can react.
    await this.eventBus.publish(event)

    return book
  }

  /**
   * Retrieves a Book by its unique identifier (ISBN) by loading its events and rehydrating its state.
   *
   * @param isbn - The Book's unique identifier.
   * @returns The rehydrated Book aggregate.
   */
  async getBookByISBN(isbn: string): Promise<Book> {
    // Look up the aggregate ID for this ISBN
    const aggregateId = await this.bookRepository.findAggregateIdByISBN(isbn)
    console.log('🚀 ~ BookService ~ getBookByISBN ~ aggregateId:', aggregateId)

    if (!aggregateId) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${isbn} not found.`,
      )
    }

    // Load events using the aggregate ID
    const events = await this.bookRepository.getEventsForAggregate(aggregateId)
    console.log('🚀 ~ BookService ~ getBookByISBN ~ events:', events)

    if (!events || events.length === 0) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${isbn} not found.`,
      )
    }

    // Rehydrate the aggregate from its event history
    return Book.rehydrate(events)
  }

  /**
   * Deletes a Book by its unique identifier by rehydrating the aggregate,
   * generating a BookDeleted event, persisting it, and publishing it.
   *
   * @param isbn - The Book's unique identifier.
   * @returns True if deletion succeeded.
   */
  async deleteBookByISBN(isbn: Book['isbn']): Promise<boolean> {
    const aggregateId = await this.bookRepository.findAggregateIdByISBN(isbn)

    if (!aggregateId) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${isbn} not found.`,
      )
    }

    // Load the aggregate's events and rehydrate its current state.
    const events = await this.bookRepository.getEventsForAggregate(aggregateId)
    console.log('🚀 ~ BookService ~ deleteBookByISBN ~ events:', events)

    if (!events || events.length === 0) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${isbn} not found.`,
      )
    }

    const currentBook = Book.rehydrate(events)

    if (currentBook.isDeleted()) {
      throw new Errors.ApplicationError(
        410,
        'BOOK_ALREADY_DELETED',
        `Book with isbn ${isbn} already deleted.`,
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

    return true
  }

  /**
   * Updates a Book by its unique identifier (ISBN) using the provided patch.
   * - Loads the existing Book aggregate by ISBN.
   * - Calls the update() method to get the updated aggregate and event.
   * - Persists the new event with optimistic concurrency.
   * - Publishes the event on the EventBus.
   *
   * @param isbn - The Book's unique identifier.
   * @param patch - Object containing fields to be updated.
   * @returns The updated Book aggregate.
   */
  async updateBook(isbn: string, patch: BookUpdateRequest): Promise<Book> {
    const aggregateId = await this.bookRepository.findAggregateIdByISBN(isbn)

    if (!aggregateId) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${isbn} not found.`,
      )
    }

    const events = await this.bookRepository.getEventsForAggregate(aggregateId)
    const currentBook = Book.rehydrate(events)

    const { book: updatedBook, event } = currentBook.update(patch)

    await this.bookRepository.saveEvents(
      aggregateId,
      [event],
      currentBook.version,
    )

    await this.eventBus.publish(event)

    return updatedBook
  }
}
