import { schemas } from '@book-library-tool/api'
import { GetBookQuery } from '@books/use_cases/queries/GetBookQuery.js'

/**
 * IBookReadProjectionRepository abstracts the persistence and retrieval of book projections
 * for Book aggregates. It ensures optimistic concurrency via version checking.
 */
export interface IBookReadProjectionRepository {
  /**
   * Retrieve all book projections with optional field selection.
   *
   * @param query - The search query parameters
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a paginated response of Book objects
   */
  getAllBooks(
    query: schemas.CatalogSearchQuery,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.PaginatedResult<schemas.Book>>

  /**
   * Retrieve a single book projection by its ID with optional field selection.
   *
   * @param query - The query parameters
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a Book object if found, or null otherwise
   */
  getBookById(
    query: GetBookQuery,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.Book | null>

  /**
   * Retrieve a single book projection by its ISBN with optional field selection.
   *
   * @param isbn - The ISBN of the book
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a Book object if found, or null otherwise
   */
  getBookByIsbn(
    isbn: string,
    fields?: schemas.BookSortField[],
  ): Promise<schemas.Book | null>
}
