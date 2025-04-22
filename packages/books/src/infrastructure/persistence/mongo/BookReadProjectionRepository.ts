import { schemas } from '@book-library-tool/api'
import {
  BaseReadProjectionRepository,
  buildRangeFilter,
  buildTextFilter,
} from '@book-library-tool/database'
import type { BookDocument } from '@books/persistence/mongo/documents/BookDocument.js'
import { IBookReadProjectionRepository } from '@books/repositories/IBookReadProjectionRepository.js'
import { GetBookQuery } from '@books/use_cases/queries/GetBookQuery.js'
import { Collection, Filter } from 'mongodb'

/**
 * Repository for performing read operations on Book projections in MongoDB.
 * Implements filtering, pagination, and mapping to/from domain models.
 */
export class BookReadProjectionRepository
  extends BaseReadProjectionRepository<BookDocument, schemas.Book>
  implements IBookReadProjectionRepository
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

    return this.executePaginatedQuery(filter, query, fields)
  }

  /**
   * Retrieves a single book by its ID, excluding soft-deleted records.
   * @param query - The query parameters containing the book ID
   * @param fields - Optional list of fields to include
   * @returns Domain Book object or null if not found
   * @throws ApplicationError on data mapping errors
   */
  async getBookById(
    query: GetBookQuery,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.Book | null> {
    return this.findOne(
      { id: query.id } as Filter<BookDocument>,
      fields,
      `book doc for ID ${query.id}`,
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
