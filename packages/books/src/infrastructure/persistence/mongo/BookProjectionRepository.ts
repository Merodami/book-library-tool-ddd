import { schemas } from '@book-library-tool/api'
import {
  BaseProjectionRepository,
  buildRangeFilter,
  buildTextFilter,
  convertDateStrings,
} from '@book-library-tool/database'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { Collection, Filter } from 'mongodb'

import type { BookDocument } from './documents/BookDocument.js'

/**
 * Repository for performing read operations on Book projections in MongoDB.
 * Implements filtering, pagination, and mapping to/from domain models.
 */
export class BookProjectionRepository
  extends BaseProjectionRepository<BookDocument, schemas.Book>
  implements IBookProjectionRepository
{
  /**
   * Constructs a new BookProjectionRepository.
   * @param collection - MongoDB collection storing BookDocument entries
   */
  constructor(collection: Collection<BookDocument>) {
    super(collection, mapToDomain)
  }

  /**
   * Retrieves a paginated list of books matching the given query parameters.
   * Supports text search, numeric range filters, sorting, and field projection.
   * @param query - Search and pagination parameters
   * @param fields - Optional list of fields to include in results
   * @returns Paginated response containing domain Book objects
   */
  async getAllBooks(
    query: schemas.CatalogSearchQuery,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.PaginatedResult<schemas.Book>> {
    // Build filter from search criteria
    const filter: Filter<BookDocument> = {}

    // Text-based filters on title, author, publisher
    Object.assign(
      filter,
      buildTextFilter('title', query.title),
      buildTextFilter('author', query.author),
      buildTextFilter('publisher', query.publisher),
    )

    // Exact ISBN match
    if (query.isbn) {
      filter.isbn = query.isbn
    }

    // Numeric range filters for publicationYear and price
    Object.assign(
      filter,
      buildRangeFilter('publicationYear', {
        exact: query.publicationYear,
        min: query.publicationYearMin,
        max: query.publicationYearMax,
      }),
      buildRangeFilter('price', {
        exact: query.price,
        min: query.priceMin,
        max: query.priceMax,
      }),
    )

    // Count total before pagination
    const total = await this.count(filter)

    // Prepare pagination values
    const skip = query.skip || 0
    const limit = query.limit || 10
    const page = Math.floor(skip / limit) + 1
    const pages = Math.ceil(total / limit)

    // Use base class to perform the query
    const data = await this.findMany(filter, {
      skip,
      limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      fields,
    })

    // Return data with pagination metadata
    return {
      data,
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
   * Retrieves a single book by its ID, excluding soft-deleted records.
   * @param id - Unique book identifier
   * @param fields - Optional list of fields to include
   * @returns Domain Book object or null if not found
   * @throws ApplicationError on data mapping errors
   */
  async getBookById(
    id: string,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.Book | null> {
    return this.findOne(
      { id } as Filter<BookDocument>,
      fields,
      `book doc for ID ${id}`,
    )
  }

  /**
   * Retrieves a single book by its ISBN, excluding soft-deleted records.
   * @param isbn - Unique book identifier
   * @param fields - Optional list of fields to include
   * @returns Domain Book object or null if not found
   * @throws ApplicationError on data mapping errors
   */
  async getBookByIsbn(
    isbn: string,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.Book | null> {
    return this.findOne(
      { isbn } as Filter<BookDocument>,
      fields,
      `book doc for ISBN ${isbn}`,
    )
  }

  /**
   * Saves a new book projection to MongoDB.
   * @param book - Domain Book object to persist
   */
  async saveBookProjection(book: schemas.Book): Promise<void> {
    await this.saveProjection(book, mapToDocument)
  }

  /**
   * Updates an existing book projection by document _id.
   * Converts any ISO string dates in updates to Date objects.
   * @param id - Document ObjectId as string
   * @param changes - Partial Book data with optional dates
   * @param updatedAt - Updated timestamp
   */
  async updateBookProjection(
    id: string,
    changes: Partial<
      Pick<
        schemas.Book,
        'title' | 'author' | 'publicationYear' | 'publisher' | 'price' | 'isbn'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void> {
    const allowedFields = [...schemas.ALLOWED_BOOK_FIELDS] as Array<
      keyof schemas.Book
    >

    await super.updateProjection(
      id,
      changes as Partial<schemas.Book>,
      allowedFields,
      updatedAt,
      ErrorCode.BOOK_NOT_FOUND,
      `Book with id "${id}" not found or deleted`,
    )
  }

  /**
   * Marks a book as deleted (soft delete).
   * @param id - Document ObjectId as string
   * @param timestamp - Deletion timestamp
   */
  async markAsDeleted(id: string, timestamp: Date): Promise<void> {
    const result = await this.collection.updateOne(
      this.buildCompleteFilter({ id } as Filter<BookDocument>),
      { $set: { deletedAt: timestamp, updatedAt: timestamp } },
    )

    if (result.matchedCount === 0) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book projection with id "${id}" not found or already deleted.`,
      )
    }
  }

  /**
   * Finds an active book for reservation by bookId, excluding deleted.
   * @param bookId - Unique book identifier
   * @returns Domain Book object or null if not found
   */
  async findBookForReservation(bookId: string): Promise<schemas.Book | null> {
    return this.findOne({ id: bookId } as Filter<BookDocument>)
  }
}

/**
 * Helper: map MongoDB document to domain Book.
 */
function mapToDomain(doc: Partial<BookDocument>): schemas.Book {
  const result: schemas.Book = {}

  // Map fields only if they exist in the document
  if ('id' in doc) result.id = doc.id
  if ('isbn' in doc) result.isbn = doc.isbn
  if ('title' in doc) result.title = doc.title
  if ('author' in doc) result.author = doc.author
  if ('publicationYear' in doc) result.publicationYear = doc.publicationYear
  if ('publisher' in doc) result.publisher = doc.publisher
  if ('price' in doc) result.price = doc.price
  if ('createdAt' in doc) result.createdAt = doc.createdAt?.toISOString()
  if ('updatedAt' in doc) result.updatedAt = doc.updatedAt?.toISOString()
  if ('deletedAt' in doc) result.deletedAt = doc.deletedAt?.toISOString()

  return result
}

/**
 * Helper: map domain Book to MongoDB document (no _id).
 */
function mapToDocument(book: schemas.Book): Omit<BookDocument, '_id'> {
  // Validate required fields
  if (
    !book.isbn ||
    !book.title ||
    !book.author ||
    !book.publicationYear ||
    !book.publisher ||
    book.price === undefined
  ) {
    throw new Errors.ApplicationError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Missing required book fields: all book properties except dates are required',
    )
  }

  // Use shared util to convert ISO date strings to Date objects
  const dates = convertDateStrings({
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    deletedAt: book.deletedAt,
  } as Record<string, unknown>) as Record<string, Date | undefined>

  // Create document with required fields
  const result: Omit<BookDocument, '_id'> = {
    id: book.id || '', // Empty string as placeholder (will be filled by business logic)
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    publisher: book.publisher,
    price: book.price,
    createdAt: dates.createdAt ?? new Date(),
  }

  // Add optional date fields
  if (dates.updatedAt) {
    result.updatedAt = dates.updatedAt
  }

  if (dates.deletedAt) {
    result.deletedAt = dates.deletedAt
  }

  return result
}
