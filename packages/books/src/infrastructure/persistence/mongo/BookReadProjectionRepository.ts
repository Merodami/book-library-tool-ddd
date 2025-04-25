import { schemas } from '@book-library-tool/api'
import { buildRangeFilter, buildTextFilter } from '@book-library-tool/database'
import { BaseReadProjectionRepository } from '@book-library-tool/database'
import { BookSortField } from '@book-library-tool/sdk'
import { GetBookQuery } from '@books/application/index.js'
import {
  DomainBook,
  IBookReadProjectionRepository,
} from '@books/domain/index.js'
import { type BookDocument, mapToDomain } from '@books/infrastructure/index.js'
import { Collection, Filter } from 'mongodb'

/**
 * Repository for performing read operations on Book projections in MongoDB.
 * Implements filtering, pagination, and mapping to/from domain models.
 */
export class BookReadProjectionRepository
  extends BaseReadProjectionRepository<BookDocument, DomainBook>
  implements IBookReadProjectionRepository
{
  /**
   * Constructs a new BookReadProjectionRepository.
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
    fields?: BookSortField[],
  ): Promise<schemas.PaginatedResult<DomainBook>> {
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
    fields?: BookSortField[],
  ): Promise<DomainBook | null> {
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
    fields?: BookSortField[],
  ): Promise<DomainBook | null> {
    return this.findOne(
      { isbn } as Filter<BookDocument>,
      fields,
      `book doc for ISBN ${isbn}`,
    )
  }
}
