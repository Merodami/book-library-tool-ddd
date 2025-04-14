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

  /**
   * Save a new book projection.
   *
   * @param bookProjection - The book projection to save
   */
  saveProjection(bookProjection: any): Promise<void>

  /**
   * Update an existing book projection.
   *
   * @param id - The ID of the book to update
   * @param updates - The updates to apply
   * @param version - The new version number
   */
  updateProjection(id: string, updates: any, version: number): Promise<void>

  /**
   * Mark a book as deleted.
   *
   * @param id - The ID of the book to mark as deleted
   * @param version - The new version number
   * @param timestamp - The timestamp of the deletion
   */
  markAsDeleted(id: string, version: number, timestamp: Date): Promise<void>

  /**
   * Find a book by ISBN for reservation validation.
   *
   * @param isbn - The ISBN of the book to find
   * @returns The book data if found, null otherwise
   */
  findBookForReservation(isbn: string): Promise<any | null>
}
