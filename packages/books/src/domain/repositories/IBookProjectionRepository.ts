import type {
  Book,
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { BookUpdateRequest } from '@book-library-tool/sdk'
import { ObjectId } from 'mongodb'

interface BookProjection {
  _id: ObjectId
  isbn: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
  deletedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

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
   * Retrieve a single book projection by its ISBN with optional field selection.
   *
   * @param isbn - The ISBN of the book
   * @param fields - Optional array of fields to return. If not provided, returns all fields.
   * @returns A promise that resolves to a Book object if found, or null otherwise
   */
  getBookByISBN(isbn: string, fields?: string[]): Promise<Book | null>

  /**
   * Save a new book projection.
   *
   * @param bookProjection - The book projection to save
   */
  saveProjection(bookProjection: Book): Promise<void>

  /**
   * Update an existing book projection.
   *
   * @param id - The ID of the book to update
   * @param updates - The updates to apply
   */
  updateProjection(id: string, updates: BookUpdateRequest): Promise<void>

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
  findBookForReservation(isbn: string): Promise<BookProjection | null>
}
