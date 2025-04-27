import { MongoWriteProjectionRepository } from '@book-library-tool/database'
import { BookField, BookFieldEnum } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type {
  BookWriteProjectionRepositoryPort,
  DomainBook,
} from '@books/domain/index.js'
import {
  type BookDocument,
  mapToDocument,
  mapToDomain,
} from '@books/infrastructure/index.js'
import { Collection, Filter } from 'mongodb'

/**
 * Repository for performing write operations on Book projections in MongoDB.
 * Implements saving and updating book projections.
 */
export class BookWriteProjectionRepository
  extends MongoWriteProjectionRepository<BookDocument, DomainBook>
  implements BookWriteProjectionRepositoryPort
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
   * Validates required fields before persisting.
   * @param book - Domain Book object to persist
   */
  async saveBookProjection(book: DomainBook): Promise<void> {
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
        DomainBook,
        'title' | 'author' | 'publicationYear' | 'publisher' | 'price' | 'isbn'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void> {
    const allowedFields = Object.values(BookFieldEnum) as BookField[]

    await this.updateProjection(
      id,
      changes as Partial<DomainBook>,
      allowedFields,
      updatedAt,
      ErrorCode.BOOK_NOT_FOUND,
      `Book with ID "${id}" not found or deleted`,
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
        `Book projection with ID "${id}" not found or already deleted.`,
      )
    }
  }
}
