import { Book } from '../entities/Book.js'

export interface IBookRepository {
  /**
   * Finds a book by its unique identifier.
   */
  findById(id: string): Promise<Book | null>

  /**
   * Persists a new book.
   */
  create(book: Book): Promise<void>

  /**
   * Deletes a book by its id.
   */
  deleteById(id: string): Promise<boolean>
}
