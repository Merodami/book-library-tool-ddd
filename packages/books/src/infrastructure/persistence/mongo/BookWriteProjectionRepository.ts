import { schemas } from '@book-library-tool/api'
import {
  BaseWriteProjectionRepository,
  convertDateStrings,
} from '@book-library-tool/database'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { IBookWriteProjectionRepository } from '@books/repositories/IBookWriteProjectionRepository.js'
import { Collection, Filter } from 'mongodb'

import type { BookDocument } from './documents/BookDocument.js'

/**
 * Repository for performing write operations on Book projections in MongoDB.
 * Implements saving and updating book projections.
 */
export class BookWriteProjectionRepository
  extends BaseWriteProjectionRepository<BookDocument, schemas.Book>
  implements IBookWriteProjectionRepository
{
  /**
   * Constructs a new BookProjectionRepository.
   * @param collection - MongoDB collection storing BookDocument entries
   */
  constructor(collection: Collection<BookDocument>) {
    super(collection, mapToDomain)
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
  if ('version' in doc) result.version = doc.version
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
    version: book.version ?? 0,
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
