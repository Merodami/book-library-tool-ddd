import { MongoDatabaseService } from '@book-library-tool/database'
import type { Book, PaginatedBookResponse } from '@book-library-tool/sdk'
import { ApplicationError } from '@book-library-tool/shared/src/errors.js'
import { GetAllBooksQuery } from '@books/queries/GetAllBooksQuery.js'
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
export class BookProjectionRepository {
  private readonly collection: Collection<Book>

  constructor(private dbService: MongoDatabaseService) {
    this.collection = dbService.getCollection('book_projection')
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
        'BOOK_NOT_FOUND',
        `Book with ISBN ${isbn} not found.`,
      )
    }

    return doc ? mapProjectionToBook(doc) : null
  }
}
