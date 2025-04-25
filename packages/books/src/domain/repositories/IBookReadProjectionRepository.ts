import { schemas } from '@book-library-tool/api'
import { IBaseReadProjectionRepository } from '@book-library-tool/database'
import { BookSortField } from '@book-library-tool/sdk'
import type { GetBookQuery } from '@books/application/index.js'
import type { DomainBook } from '@books/domain/index.js'
import type { BookDocument } from '@books/infrastructure/index.js'

/**
 * IBookReadProjectionRepository abstracts the persistence and retrieval of book projections
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface IBookReadProjectionRepository
  extends IBaseReadProjectionRepository<BookDocument, DomainBook> {
  /**
   * Retrieve all book projections with optional field selection.
   *
   * @param query - The search query parameters
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a paginated response of Book objects
   */
  getAllBooks(
    query: schemas.CatalogSearchQuery,
    fields?: BookSortField[],
  ): Promise<schemas.PaginatedResult<DomainBook>>

  /**
   * Retrieve a single book projection by its ID with optional field selection.
   *
   * @param query - The query parameters
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a Book object if found, or null otherwise
   */
  getBookById(
    query: GetBookQuery,
    fields?: BookSortField[],
  ): Promise<DomainBook | null>

  /**
   * Retrieve a single book projection by its ISBN with optional field selection.
   *
   * @param isbn - The ISBN of the book
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a Book object if found, or null otherwise
   */
  getBookByIsbn(
    isbn: string,
    fields?: BookSortField[],
  ): Promise<DomainBook | null>
}
