import { MongoDatabaseService } from '@book-library-tool/database'
import type {
  Book,
  BookUpdateRequest,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { ErrorCode, getDefaultMessageForError } from '@book-library-tool/shared'
import { ApplicationError } from '@book-library-tool/shared/src/errors.js'
import { GetAllBooksQuery } from '@queries/GetAllBooksQuery.js'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
import type { Collection } from 'mongodb'

/**
 * Maps a MongoDB document to the Book domain model.
 * This function ensures that the data structure returned from the database
 * matches the expected Book interface, providing a consistent API response.
 * It also handles the transformation of MongoDB's _id field and ensures
 * proper date formatting for timestamps.
 *
 * @param doc - The raw MongoDB document containing book data
 * @returns A properly formatted Book object ready for API responses
 */
function mapProjectionToBook(doc: any): Book {
  return {
    isbn: doc.isbn,
    title: doc.title,
    author: doc.author,
    publicationYear: doc.publicationYear,
    publisher: doc.publisher,
    price: doc.price,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/**
 * Repository implementation for accessing book projections in MongoDB.
 * This class is part of the CQRS pattern's read model, providing efficient
 * query capabilities for book data. It implements the IBookProjectionRepository
 * interface and handles all read operations for books.
 *
 * The repository uses MongoDB's aggregation framework for complex queries
 * and implements proper indexing for optimal performance.
 */
export class BookProjectionRepository implements IBookProjectionRepository {
  private readonly collection: Collection<any>
  private readonly BOOK_PROJECTION_TABLE = 'book_projection'

  constructor(private dbService: MongoDatabaseService) {
    this.collection = dbService.getCollection(this.BOOK_PROJECTION_TABLE)
  }

  /**
   * Retrieves a paginated list of books with support for multiple filtering options.
   * This method implements a flexible search mechanism that supports:
   * - Case-insensitive partial text matching for title and author
   * - Exact matching for publication year
   * - Pagination with configurable page size
   *
   * The search is optimized using MongoDB's regex capabilities with proper
   * escaping of special characters to prevent regex injection.
   *
   * @param query - Query parameters including:
   *                - title: Partial text match (case-insensitive)
   *                - author: Partial text match (case-insensitive)
   *                - publicationYear: Exact year match
   *                - limit: Number of items per page (default: 10)
   *                - page: Page number (default: 1)
   * @returns A paginated response containing:
   *          - books: Array of matching Book objects
   *          - total: Total number of matching books
   *          - page: Current page number
   *          - limit: Number of items per page
   */
  async getAllBooks(query: GetAllBooksQuery): Promise<PaginatedBookResponse> {
    const { title, author, publicationYear, limit = 10, page = 1 } = query

    const filter: Record<string, unknown> = {}

    if (title && typeof title === 'string' && title.trim().length > 0) {
      // Use regex for a case-insensitive search in the title field
      const escapedTitle = title.trim().replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
      filter.title = { $regex: escapedTitle, $options: 'i' }
    }

    if (author && typeof author === 'string' && author.trim().length > 0) {
      // Use regex for a case-insensitive search in the author field
      const escapedAuthor = author
        .trim()
        .replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
      filter.author = { $regex: escapedAuthor, $options: 'i' }
    }

    if (publicationYear) {
      filter.publicationYear = Number(publicationYear)
    }

    // Use the pagination helper to get paginated books data
    const paginatedBooks = await this.dbService.paginateCollection<Book>(
      this.collection,
      filter,
      { limit, page },
      { projection: { _id: 0 } },
    )

    return paginatedBooks
  }

  /**
   * Retrieves a single book by its ISBN.
   * This method implements a fast lookup using the ISBN index and includes
   * soft-delete checking to ensure deleted books are not returned.
   *
   * @param isbn - The ISBN of the book to retrieve (must be a valid ISBN)
   * @returns The Book object if found and not deleted, null if not found
   * @throws {ApplicationError} If the book is found but marked as deleted,
   *                           with error code 'BOOK_NOT_FOUND' and HTTP 404 status
   */
  async getBookByISBN(isbn: string): Promise<Book | null> {
    const doc = await this.collection.findOne({ isbn })

    if (doc && doc.deletedAt) {
      throw new ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        getDefaultMessageForError(ErrorCode.BOOK_NOT_FOUND),
      )
    }

    return doc ? mapProjectionToBook(doc) : null
  }

  /**
   * Saves a new book projection in the database.
   *
   * @param bookProjection - The book projection data to save
   */
  async saveProjection(bookProjection: any): Promise<void> {
    await this.collection.insertOne(bookProjection)
  }

  /**
   * Updates a book projection with partial data.
   *
   * @param id - The aggregate ID of the book to update
   * @param updates - Partial book data to update
   */
  async updateProjection(
    id: string,
    updates: BookUpdateRequest,
  ): Promise<void> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    )
  }

  /**
   * Marks a book as deleted by setting the deletedAt timestamp.
   *
   * @param id - The aggregate ID of the book to mark as deleted
   * @param timestamp - The timestamp when the book was deleted
   */
  async markAsDeleted(id: string, timestamp: Date): Promise<void> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          deletedAt: timestamp,
          updatedAt: timestamp,
        },
      },
    )
  }

  /**
   * Finds a book for reservation validation.
   *
   * @param isbn - The ISBN of the book to find
   * @returns The book data if found and not deleted, null otherwise
   */
  async findBookForReservation(isbn: string): Promise<any | null> {
    return this.collection.findOne({
      isbn,
      deletedAt: { $exists: false },
    })
  }
}
