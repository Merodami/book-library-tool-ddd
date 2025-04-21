import {
  assertDocument,
  buildProjection,
  buildRangeFilter,
  buildTextFilter,
  convertDateStrings,
} from '@book-library-tool/database'
import type {
  Book as BookDTO,
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { Collection, ObjectId } from 'mongodb'

import type { BookDocument } from './documents/BookDocument.js'

/**
 * Repository for performing read operations on Book projections in MongoDB.
 * Implements filtering, pagination, and mapping to/from domain models.
 */
export class BookProjectionRepository implements IBookProjectionRepository {
  /**
   * Constructs a new BookProjectionRepository.
   * @param collection - MongoDB collection storing BookDocument entries
   */
  constructor(private readonly collection: Collection<BookDocument>) {}

  /**
   * Retrieves a paginated list of books matching the given query parameters.
   * Supports text search, numeric range filters, sorting, and field projection.
   * @param query - Search and pagination parameters
   * @param fields - Optional list of fields to include in results
   * @returns Paginated response containing domain Book objects
   */
  async getAllBooks(
    query: CatalogSearchQuery,
    fields?: string[],
  ): Promise<PaginatedBookResponse> {
    // Base filter excludes soft-deleted records
    const dbQuery: Record<string, unknown> = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    }

    // Text-based filters on title, author, publisher
    Object.assign(
      dbQuery,
      buildTextFilter('title', query.title),
      buildTextFilter('author', query.author),
      buildTextFilter('publisher', query.publisher),
    )

    // Exact ISBN match
    if (query.isbn) {
      dbQuery.isbn = query.isbn
    }

    // Numeric range filters for publicationYear and price
    Object.assign(
      dbQuery,
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
    const total = await this.collection.countDocuments(dbQuery)
    const skip = query.skip || 0
    const limit = query.limit || 10
    const page = Math.floor(skip / limit) + 1
    const pages = Math.ceil(total / limit)

    // Build cursor with projection, skip, limit, and optional sort
    let cursor = this.collection
      .find(dbQuery)
      .project(buildProjection(fields))
      .skip(skip)
      .limit(limit)

    if (query.sortBy && query.sortOrder) {
      cursor = cursor.sort({
        [query.sortBy]: query.sortOrder === 'ASC' ? 1 : -1,
      })
    }

    // Execute query and map documents to domain models
    const docs = await cursor.toArray()

    const data = docs.map((d) =>
      mapToDomain(
        assertDocument<BookDocument>(d, [
          'isbn',
          'title',
          'author',
          'publicationYear',
          'publisher',
          'price',
          'createdAt',
          'updatedAt',
        ]),
      ),
    )

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
  async getBookById(id: string, fields?: string[]): Promise<BookDTO | null> {
    const doc = await this.collection.findOne(
      {
        id,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      },
      { projection: buildProjection(fields) },
    )

    if (!doc) return null

    try {
      return mapToDomain(
        assertDocument<BookDocument>(doc, [
          'id',
          'isbn',
          'title',
          'author',
          'publicationYear',
          'publisher',
          'price',
          'createdAt',
          'updatedAt',
        ]),
      )
    } catch (err) {
      logger.error(`Invalid book doc for ID ${id}:`, err)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        'Invalid book data',
      )
    }
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
    fields?: string[],
  ): Promise<BookDTO | null> {
    const doc = await this.collection.findOne(
      {
        isbn,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      },
      { projection: buildProjection(fields) },
    )

    if (!doc) return null

    try {
      return mapToDomain(
        assertDocument<BookDocument>(doc, [
          'id',
          'isbn',
          'title',
          'author',
          'publicationYear',
          'publisher',
          'price',
          'createdAt',
          'updatedAt',
        ]),
      )
    } catch (err) {
      logger.error(`Invalid book doc for ISBN ${isbn}:`, err)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        'Invalid book data',
      )
    }
  }

  /**
   * Saves a new book projection to MongoDB.
   * @param book - Domain Book object to persist
   */
  async saveProjection(book: BookDTO): Promise<void> {
    const doc = mapToDocument(book)

    await this.collection.insertOne({ ...doc, _id: new ObjectId() })
  }

  /**
   * Updates an existing book projection by document _id.
   * Converts any ISO string dates in updates to Date objects.
   * @param id - Document ObjectId as string
   * @param updates - Partial Book data with optional dates
   */
  async updateProjection(
    id: string,
    changes: Partial<
      Pick<
        BookDTO,
        'title' | 'author' | 'publicationYear' | 'publisher' | 'price' | 'isbn'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void> {
    const allowed: Array<keyof typeof changes> = [
      'title',
      'author',
      'publicationYear',
      'publisher',
      'price',
      'isbn',
    ]
    const setFields: Record<string, unknown> = {}

    // ToDo: Remove this once we have a proper ID generator
    for (const key of allowed) {
      /* eslint-disable-next-line security/detect-object-injection */
      if (changes[key] !== undefined) {
        /* eslint-disable-next-line security/detect-object-injection */
        setFields[key] = changes[key]!
      }
    }

    setFields.updatedAt =
      updatedAt instanceof Date ? updatedAt : new Date(updatedAt)

    if (Object.keys(setFields).length === 0) {
      return
    }

    const result = await this.collection.updateOne(
      {
        id,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      },
      { $set: setFields },
    )

    if (result.matchedCount === 0) {
      throw new Errors.ApplicationError(
        410,
        ErrorCode.BOOK_NOT_FOUND,
        `Book projection with id "${id}" not found or already deleted.`,
      )
    }
  }

  /**
   * Marks a book as deleted (soft delete).
   * @param id - Document ObjectId as string
   * @param timestamp - Deletion timestamp
   */
  async markAsDeleted(id: string, timestamp: Date): Promise<void> {
    const filter = {
      id,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    }

    const result = await this.collection.updateOne(filter, {
      $set: { deletedAt: timestamp, updatedAt: timestamp },
    })

    if (result.matchedCount === 0) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book projection with id "${id}" not found or already deleted.`,
      )
    }
  }

  /**
   * Finds an active book for reservation by ISBN, excluding deleted.
   * @param isbn - Unique book identifier
   * @returns Domain Book object or null if not found
   */
  async findBookForReservation(isbn: string): Promise<BookDTO | null> {
    const doc = await this.collection.findOne({
      isbn,
      deletedAt: { $exists: false },
    })

    if (!doc) return null
    try {
      return mapToDomain(assertDocument<BookDocument>(doc, ['isbn']))
    } catch {
      return null
    }
  }
}

/**
 * Helper: map MongoDB document to domain Book.
 */
function mapToDomain(doc: BookDocument): BookDTO {
  return {
    id: doc.id,
    isbn: doc.isbn,
    title: doc.title,
    author: doc.author,
    publicationYear: doc.publicationYear,
    publisher: doc.publisher,
    price: doc.price,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
    deletedAt: doc.deletedAt?.toISOString(),
  }
}

/**
 * Helper: map domain Book to MongoDB document (no _id).
 */
function mapToDocument(book: BookDTO): Omit<BookDocument, '_id'> {
  // Use shared util to convert ISO date strings to Date objects
  const dates = convertDateStrings({
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    deletedAt: book.deletedAt,
  } as Record<string, unknown>) as Record<string, Date | undefined>

  return {
    // ToDo: Remove this once we have a proper ID generator
    id: book.id || '',
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    publisher: book.publisher,
    price: book.price,
    createdAt: dates.createdAt ?? new Date(),
    updatedAt: dates.updatedAt ?? new Date(),
    deletedAt: dates.deletedAt,
  }
}
