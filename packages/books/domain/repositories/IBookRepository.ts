import { Book } from '../entities/Book.js'

export interface IBookRepository {
  /**
   * Finds a book by its unique identifier.
   */
  findByISBN(isbn: Book['isbn']): Promise<Book | null>

  /**
   * Persists a new book.
   */
  create(book: Book): Promise<void>

  /**
   * Deletes a book by its id.
   */
  deleteByISBN(isbn: Book['isbn']): Promise<boolean>
}
