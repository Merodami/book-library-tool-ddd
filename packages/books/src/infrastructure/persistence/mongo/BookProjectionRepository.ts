import { BookDTO } from '@book-library-tool/api/src/schemas/books.js'
import type {
  Book,
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { ErrorCode, logger } from '@book-library-tool/shared'
import { ApplicationError } from '@book-library-tool/shared/src/errors.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { Collection, Document, ObjectId } from 'mongodb'

import { BookDocument } from './documents/BookDocument.js'

/**
 * Defines the allowed fields for book projections.
 * This ensures type safety when building projections and queries.
 */
const ALLOWED_FIELDS = [
  'title',
  'author',
  'isbn',
  'publicationYear',
  'publisher',
  'price',
] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

/**
 * Represents a database query for book projections.
 * This interface defines the structure of MongoDB query objects
 * used in find operations.
 */
interface DbQuery {
  title?: { $regex: string; $options: string }
  author?: { $regex: string; $options: string }
  isbn?: string
  publicationYear?: number | { $gte?: number; $lte?: number }
  publisher?: { $regex: string; $options: string }
  price?: number | { $gte?: number; $lte?: number }
  deletedAt?: { $exists: boolean }
}

/**
 * Maps a domain Book model to a database document.
 * Converts ISO date strings to native Date objects for MongoDB storage.
 *
 * @param book - The domain Book object with string dates
 * @returns A database-compatible document with Date objects
 */
function mapBookToDocument(book: Book): Omit<BookDocument, '_id'> {
  return {
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    publisher: book.publisher,
    price: book.price,
    createdAt: book.createdAt ? new Date(book.createdAt) : new Date(),
    updatedAt: book.updatedAt ? new Date(book.updatedAt) : new Date(),
    deletedAt: book.deletedAt ? new Date(book.deletedAt) : undefined,
  }
}

/**
 * Maps a database document to a domain Book model.
 * Converts MongoDB Date objects to ISO string format for the API layer.
 *
 * @param document - The database document with Date objects
 * @returns A domain-compatible Book object with ISO string dates
 */
function mapDocumentToBook(document: BookDocument): Book {
  return {
    isbn: document.isbn,
    title: document.title,
    author: document.author,
    publicationYear: document.publicationYear,
    publisher: document.publisher,
    price: document.price,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    deletedAt: document.deletedAt?.toISOString(),
  }
}

/**
 * Converts update fields with string dates to a MongoDB-compatible format with Date objects.
 * Used when preparing data for database operations.
 *
 * @param updates - Partial BookDTO with potential string dates
 * @returns MongoDB-compatible updates with Date objects
 */
function convertUpdateDatesToMongo(
  updates: Partial<BookDTO>,
): Record<string, any> {
  const result: Record<string, any> = { ...updates }

  // Convert any ISO date strings to Date objects
  if (typeof updates.createdAt === 'string') {
    result.createdAt = new Date(updates.createdAt)
  }

  if (typeof updates.updatedAt === 'string') {
    result.updatedAt = new Date(updates.updatedAt)
  }

  if (typeof updates.deletedAt === 'string') {
    result.deletedAt = new Date(updates.deletedAt)
  }

  return result
}

/**
 * Validates that a document is a valid BookDocument.
 * This function provides runtime type safety for database operations.
 *
 * @param doc - The document to validate
 * @returns The document cast as a BookDocument if valid
 * @throws Error if the document is not a valid BookDocument
 */
function assertBookDocument(doc: Document): BookDocument {
  if (
    !doc._id ||
    !doc.isbn ||
    !doc.title ||
    !doc.author ||
    typeof doc.publicationYear !== 'number' ||
    !doc.publisher ||
    typeof doc.price !== 'number' ||
    !(doc.createdAt instanceof Date) ||
    !(doc.updatedAt instanceof Date) ||
    (doc.deletedAt !== undefined && !(doc.deletedAt instanceof Date))
  ) {
    throw new Error('Invalid book document')
  }
  return doc as BookDocument
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
  private readonly collection: Collection<BookDocument>

  /**
   * Creates a new BookProjectionRepository instance.
   *
   * @param collection - The MongoDB collection for book projections
   */
  constructor(collection: Collection<BookDocument>) {
    this.collection = collection
  }

  /**
   * Builds a text search query for MongoDB.
   * This method handles regex escaping to prevent injection attacks.
   *
   * @param query - The search query containing text fields
   * @returns A MongoDB query object for text search
   */
  private buildTextSearchQuery(query: CatalogSearchQuery): Partial<DbQuery> {
    const textSearch: Partial<DbQuery> = {}

    if (
      query.title &&
      typeof query.title === 'string' &&
      query.title.trim().length > 0
    ) {
      const escapedTitle = query.title
        .trim()
        .replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
      textSearch.title = { $regex: escapedTitle, $options: 'i' }
    }

    if (
      query.author &&
      typeof query.author === 'string' &&
      query.author.trim().length > 0
    ) {
      const escapedAuthor = query.author
        .trim()
        .replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
      textSearch.author = { $regex: escapedAuthor, $options: 'i' }
    }

    if (
      query.publisher &&
      typeof query.publisher === 'string' &&
      query.publisher.trim().length > 0
    ) {
      const escapedPublisher = query.publisher
        .trim()
        .replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
      textSearch.publisher = { $regex: escapedPublisher, $options: 'i' }
    }

    return textSearch
  }

  /**
   * Builds a range query for numeric fields.
   * This method supports exact matches, minimum/maximum bounds, or both.
   *
   * @param field - The field to query (publicationYear or price)
   * @param min - The minimum value (inclusive)
   * @param max - The maximum value (inclusive)
   * @param exact - An exact value to match
   * @returns A MongoDB query object for range queries
   */
  private buildRangeQuery(
    field: 'publicationYear' | 'price',
    min?: number,
    max?: number,
    exact?: number,
  ): Partial<DbQuery> {
    if (exact !== undefined) {
      return { [field]: exact }
    }

    if (min !== undefined || max !== undefined) {
      const range: { $gte?: number; $lte?: number } = {}

      if (min !== undefined) {
        range.$gte = min
      }

      if (max !== undefined) {
        range.$lte = max
      }

      return { [field]: range }
    }

    return {}
  }

  /**
   * Builds a MongoDB projection object based on requested fields.
   * This method ensures only allowed fields are included in the projection.
   *
   * @param fields - The list of fields to include
   * @returns A MongoDB projection object
   */
  private buildProjection(
    fields?: string[],
  ): Partial<Record<AllowedField | '_id', 0 | 1>> {
    const projection: Partial<Record<AllowedField | '_id', 0 | 1>> = { _id: 0 }

    if (fields?.length) {
      // If specific fields are requested, use inclusion projection
      delete projection._id

      for (const field of fields) {
        if (ALLOWED_FIELDS.includes(field as AllowedField)) {
          projection[field as AllowedField] = 1
        }
      }
    }

    return projection
  }

  /**
   * Retrieves a paginated list of books with support for multiple filtering options.
   * This method implements a flexible search mechanism that supports:
   * - Case-insensitive partial text matching for title, author, and publisher
   * - Exact matching or range queries for numeric fields
   * - Sorting by any field
   * - Field selection for performance optimization
   * - Pagination with configurable page size
   *
   * @param query - Search query parameters
   * @param fields - Optional list of fields to include in the results
   * @returns A paginated response of books matching the query
   */
  async getAllBooks(
    query: CatalogSearchQuery,
    fields?: string[],
  ): Promise<PaginatedBookResponse> {
    // Build the base query, ensuring deleted books are excluded
    const dbQuery: DbQuery = {
      deletedAt: { $exists: false },
      ...this.buildTextSearchQuery(query),
    }

    // Add exact match fields
    if (query.isbn) {
      dbQuery.isbn = query.isbn
    }

    // Add range queries for numeric fields
    Object.assign(
      dbQuery,
      this.buildRangeQuery(
        'publicationYear',
        query.publicationYearMin,
        query.publicationYearMax,
        query.publicationYear,
      ),
    )

    Object.assign(
      dbQuery,
      this.buildRangeQuery(
        'price',
        query.priceMin,
        query.priceMax,
        query.price,
      ),
    )

    // Get total count and calculate pagination
    const total = await this.collection.countDocuments(dbQuery)
    const skip = query.skip || 0
    const limit = query.limit || 10
    const page = Math.floor(skip / limit) + 1
    const pages = Math.ceil(total / limit)

    // Build and execute the query
    const cursor = this.collection
      .find(dbQuery)
      .project(this.buildProjection(fields))
      .skip(skip)
      .limit(limit)

    // Apply sorting if requested
    if (query.sortBy && query.sortOrder) {
      cursor.sort({ [query.sortBy]: query.sortOrder === 'ASC' ? 1 : -1 })
    }

    // Execute the query and map results to domain models
    const books = await cursor.toArray()

    return {
      data: books.map((book) => mapDocumentToBook(assertBookDocument(book))),
      pagination: {
        total,
        page,
        limit,
        pages,
        hasNext: skip + limit < total,
        hasPrev: skip > 0,
      },
    }
  }

  /**
   * Retrieves a single book by its ISBN.
   * This method implements a fast lookup using the ISBN index and includes
   * soft-delete checking to ensure deleted books are not returned.
   *
   * @param isbn - The ISBN of the book to retrieve
   * @param fields - Optional list of fields to include in the result
   * @returns The Book object if found and not deleted, null if not found
   * @throws ApplicationError if an error occurs during retrieval
   */
  async getBookByISBN(isbn: string, fields?: string[]): Promise<Book | null> {
    const book = await this.collection.findOne(
      { isbn, deletedAt: { $exists: false } },
      { projection: this.buildProjection(fields) },
    )

    if (!book) return null

    try {
      return mapDocumentToBook(assertBookDocument(book))
    } catch (error) {
      logger.error(`Invalid book data found for ISBN ${isbn}: ${error}`)

      throw new ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        `Invalid book data found for ISBN ${isbn}`,
      )
    }
  }

  /**
   * Saves a new book projection in the database.
   * This method creates a new MongoDB document from a domain Book model,
   * converting string dates to Date objects.
   *
   * @param bookProjection - The book data to save (with string dates)
   */
  async saveProjection(bookProjection: Book): Promise<void> {
    const document: BookDocument = {
      ...mapBookToDocument(bookProjection),
      _id: new ObjectId(),
    }

    await this.collection.insertOne(document)
  }

  /**
   * Updates an existing book projection.
   * This method applies partial updates to a book document and updates the updatedAt timestamp,
   * converting any string dates to Date objects for MongoDB storage.
   *
   * @param id - The ID of the book to update
   * @param updates - The book data to update (with potential string dates)
   */
  async updateProjection(id: string, updates: Partial<BookDTO>): Promise<void> {
    // Convert any string dates to Date objects for MongoDB storage
    const mongoUpdates = convertUpdateDatesToMongo(updates)

    // If updatedAt wasn't specifically set in the updates, add it with the current time
    if (!updates.updatedAt) {
      mongoUpdates.updatedAt = new Date()
    }

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: mongoUpdates },
    )
  }

  /**
   * Marks a book as deleted by setting the deletedAt timestamp.
   * This implements soft delete functionality to maintain data history.
   *
   * @param id - The ID of the book to mark as deleted
   * @param timestamp - The timestamp when the book was deleted (Date object)
   */
  async markAsDeleted(id: string, timestamp: Date): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
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
   * This method checks if a book exists and is not deleted.
   *
   * @param isbn - The ISBN of the book to find
   * @returns The book data if found and not deleted, null otherwise
   */
  async findBookForReservation(isbn: string): Promise<Book | null> {
    const book = await this.collection.findOne({
      isbn,
      deletedAt: { $exists: false },
    })

    if (!book) return null

    try {
      return mapDocumentToBook(assertBookDocument(book))
    } catch {
      return null
    }
  }
}
