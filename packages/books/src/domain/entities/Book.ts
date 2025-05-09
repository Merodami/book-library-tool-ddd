import { schemas } from '@book-library-tool/api'
import {
  AggregateRoot,
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
} from '@book-library-tool/event-store'
import { makeValidator } from '@book-library-tool/http'
import type { DomainEvent } from '@book-library-tool/shared'
import {
  ErrorCode,
  Errors,
  getDefaultMessageForError,
  logger,
} from '@book-library-tool/shared'

// Schema validator for Book
const assertSchema = makeValidator(schemas.BookSchema)

export interface BookProps {
  isbn: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
}

/**
 * The Book aggregate extends AggregateRoot, inheriting domain event management capabilities,
 * version tracking, and a consistent ID management approach.
 */
export class Book extends AggregateRoot {
  public readonly isbn: string
  public title: string
  public author: string
  public publicationYear: number
  public publisher: string
  public price: number
  public createdAt: Date
  public updatedAt: Date
  public deletedAt?: Date

  /**
   * Private constructor enforces creation via factory methods.
   * @param id - Aggregate ID (from AggregateRoot, typically a UUID).
   * @param props - The book's properties.
   * @param createdAt - Creation timestamp.
   * @param updatedAt - Last update timestamp.
   * @param deletedAt - Optional deletion timestamp.
   */
  private constructor(
    id: string | undefined,
    props: BookProps,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date,
  ) {
    super(id)
    this.isbn = props.isbn
    this.title = props.title
    this.author = props.author
    this.publicationYear = props.publicationYear
    this.publisher = props.publisher
    this.price = props.price
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.deletedAt = deletedAt
    this.version = 0
  }

  /**
   * Factory method that creates a new Book aggregate and returns it along with a BookCreated event.
   * @param command - The book creation command containing required properties
   */
  public static create(command: BookProps): { book: Book; event: DomainEvent } {
    // Validate using schema
    assertSchema(command)

    const timestamp = new Date()

    // Pass undefined so AggregateRoot generates a new UUID
    const book = new Book(undefined, command, timestamp, timestamp)

    const event: DomainEvent = {
      aggregateId: book.id,
      eventType: BOOK_CREATED,
      payload: {
        ...command,
        id: book.id,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      },
      timestamp,
      version: 1,
      schemaVersion: 1,
    }

    book.addDomainEvent(event)

    return { book, event }
  }

  /**
   * Updates the Book with partial new values and produces a BookUpdated event.
   * @param command - Partial book properties to update
   */
  public update(command: Partial<Omit<BookProps, 'isbn'>>): {
    book: Book
    event: DomainEvent
  } {
    // Check if book is deleted
    if (this.deletedAt) {
      throw new Errors.ApplicationError(
        422,
        ErrorCode.BOOK_ALREADY_DELETED,
        `Book with ID ${this.id} has been deleted and cannot be updated.`,
      )
    }

    // Only process if there are actual changes
    if (!this.hasChanges(command)) {
      throw new Errors.ApplicationError(
        422,
        ErrorCode.NO_CHANGES,
        getDefaultMessageForError(ErrorCode.NO_CHANGES),
      )
    }

    const updatedProps: BookProps = {
      isbn: this.isbn, // ISBN is immutable
      title: command.title ?? this.title,
      author: command.author ?? this.author,
      publicationYear: command.publicationYear ?? this.publicationYear,
      publisher: command.publisher ?? this.publisher,
      price: command.price ?? this.price,
    }

    // Validate the updated properties
    assertSchema(updatedProps)

    const timestamp = new Date()
    const newVersion = this.version + 1

    const updatedBook = new Book(
      this.id,
      updatedProps,
      this.createdAt,
      timestamp,
      this.deletedAt,
    )

    updatedBook.version = newVersion

    const event: DomainEvent = {
      aggregateId: this.id,
      eventType: BOOK_UPDATED,
      payload: {
        previous: {
          title: this.title,
          author: this.author,
          publicationYear: this.publicationYear,
          publisher: this.publisher,
          price: this.price,
        },
        updated: {
          title: updatedProps.title,
          author: updatedProps.author,
          publicationYear: updatedProps.publicationYear,
          publisher: updatedProps.publisher,
          price: updatedProps.price,
        },
        updatedAt: timestamp.toISOString(),
      },
      timestamp,
      version: newVersion,
      schemaVersion: 1,
    }

    updatedBook.addDomainEvent(event)

    return { book: updatedBook, event }
  }

  /**
   * Soft deletes the Book aggregate and produces a BookDeleted event.
   */
  public delete(): { book: Book; event: DomainEvent } {
    // Check if already deleted
    if (this.deletedAt) {
      throw new Error(`Book with ID ${this.id} is already deleted.`)
    }

    const timestamp = new Date()
    const newVersion = this.version + 1

    const deletedBook = new Book(
      this.id,
      {
        isbn: this.isbn,
        title: this.title,
        author: this.author,
        publicationYear: this.publicationYear,
        publisher: this.publisher,
        price: this.price,
      },
      this.createdAt,
      this.updatedAt,
      timestamp, // Set deletedAt
    )

    deletedBook.version = newVersion

    const event: DomainEvent = {
      aggregateId: this.id,
      eventType: BOOK_DELETED,
      payload: {
        deletedAt: timestamp.toISOString(),
      },
      timestamp,
      version: newVersion,
      schemaVersion: 1,
    }

    deletedBook.addDomainEvent(event)

    return { book: deletedBook, event }
  }

  /**
   * Rehydrates a Book aggregate from an array of DomainEvents.
   * @param events - Array of domain events, should be sorted by version
   * @throws {Error} If no events are provided or required events are missing
   */
  public static rehydrate(events: DomainEvent[]): Book {
    if (!events || events.length === 0) {
      throw new Error('No events provided to rehydrate the Book aggregate')
    }

    // Sort events by version to ensure correct order
    events.sort((a, b) => a.version - b.version)

    // First event must be BookCreated
    if (events[0].eventType !== BOOK_CREATED) {
      throw new Error('First event must be a BookCreated event')
    }

    // Create initial book state from first event
    const firstEvent = events[0]
    const book = new Book(
      firstEvent.aggregateId,
      {
        isbn: firstEvent.payload.isbn,
        title: firstEvent.payload.title,
        author: firstEvent.payload.author,
        publicationYear: firstEvent.payload.publicationYear,
        publisher: firstEvent.payload.publisher,
        price: firstEvent.payload.price,
      },
      new Date(firstEvent.timestamp),
      new Date(firstEvent.timestamp),
    )

    book.version = firstEvent.version

    // Apply all subsequent events
    for (let i = 1; i < events.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      book.applyEvent(events[i])

      // eslint-disable-next-line security/detect-object-injection
      book.version = events[i].version
    }

    return book
  }

  /**
   * Implements the abstract applyEvent method from AggregateRoot.
   * Updates the aggregate's state based on the event type.
   * @param event - Domain event to apply
   */
  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case BOOK_CREATED: {
        // Book creation is handled in rehydrate initial state
        // This primarily handles the case when re-applying events from scratch
        this.title = event.payload.title
        this.author = event.payload.author
        this.publicationYear = event.payload.publicationYear
        this.publisher = event.payload.publisher
        this.price = event.payload.price
        this.createdAt = new Date(event.timestamp)
        this.updatedAt = new Date(event.timestamp)
        break
      }
      case BOOK_UPDATED: {
        // Update mutable properties
        this.title = event.payload.updated.title
        this.author = event.payload.updated.author
        this.publicationYear = event.payload.updated.publicationYear
        this.publisher = event.payload.updated.publisher
        this.price = event.payload.updated.price
        this.updatedAt = new Date(event.timestamp)
        break
      }
      case BOOK_DELETED: {
        // Mark as deleted
        this.deletedAt = new Date(event.timestamp)
        break
      }
      default:
        logger.warn(`Unhandled event type in applyEvent: ${event.eventType}`)
    }
  }

  /**
   * Checks if the update command contains any actual changes
   * @param command - Partial update command
   * @returns True if there are changes, false otherwise
   * @private
   */
  private hasChanges(command: Partial<Omit<BookProps, 'isbn'>>): boolean {
    return (
      (command.title !== undefined && command.title !== this.title) ||
      (command.author !== undefined && command.author !== this.author) ||
      (command.publicationYear !== undefined &&
        command.publicationYear !== this.publicationYear) ||
      (command.publisher !== undefined &&
        command.publisher !== this.publisher) ||
      (command.price !== undefined && command.price !== this.price)
    )
  }

  /**
   * Checks if the book is deleted
   * @returns True if the book is deleted, false otherwise
   */
  public isDeleted(): boolean {
    return this.deletedAt !== undefined
  }
}
