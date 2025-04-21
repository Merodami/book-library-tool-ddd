import type {
  Book as BookDTO,
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
export interface IBookProjectionRepository {
  /**
   * Retrieve all book projections with optional field selection.
   *
   * @param query - The search query parameters
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a paginated response of Book objects
   */
  getAllBooks(
    query: CatalogSearchQuery,
    fields?: string[],
  ): Promise<PaginatedBookResponse>

  /**
   * Retrieve a single book projection by its ID with optional field selection.
   *
   * @param id - The ID of the book
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a Book object if found, or null otherwise
   */
  getBookById(id: string, fields?: string[]): Promise<BookDTO | null>

  /**
   * Retrieve a single book projection by its ISBN with optional field selection.
   *
   * @param isbn - The ISBN of the book
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a Book object if found, or null otherwise
   */
  getBookByIsbn(isbn: string, fields?: string[]): Promise<BookDTO | null>

  /**
   * Save a new book projection.
   *
   * @param bookProjection - The book projection to save
   */
  saveProjection(bookProjection: BookDTO): Promise<void>

  /**
   * Partially update the projection for a given book ID.
   * @param id - aggregate/book ID
   * @param changes - only the fields you want to modify
   * @param updatedAt - when this change happened
   */
  updateProjection(
    id: string,
    changes: Partial<
      Pick<
        BookDTO,
        'title' | 'author' | 'publicationYear' | 'publisher' | 'price' | 'isbn'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void>

  /**
   * Mark a book as deleted.
   *
   * @param id - The ID of the book to mark as deleted
   * @param timestamp - The timestamp of the deletion
   */
  markAsDeleted(id: string, timestamp: Date): Promise<void>

  /**
   * Find a book by ISBN for reservation validation.
   *
   * @param isbn - The ISBN of the book to find
   * @returns The book data if found, null otherwise
   */
  findBookForReservation(isbn: string): Promise<BookDTO | null>
}
