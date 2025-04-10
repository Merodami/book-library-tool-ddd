import type {
  Book,
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'

export interface IBookProjectionRepository {
  /**
   * Retrieve all book projections.
   *
   * @returns A promise that resolves to an array of Book objects.
   */
  getAllBooks(query: CatalogSearchQuery): Promise<PaginatedBookResponse>

  /**
   * Retrieve a single book projection by its ISBN.
   *
   * @param isbn - The ISBN of the book.
   * @returns A promise that resolves to a Book object if found, or null otherwise.
   */
  getBookByISBN(isbn: string): Promise<Book | null>
}
