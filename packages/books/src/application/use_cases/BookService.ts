import { BookRequest } from '@book-library-tool/sdk'
import { Errors } from '@book-library-tool/shared'
import { Book } from '@entities/Book.js'
import { IBookRepository } from '@repositories/IBookRepository.js'

export class BookService {
  constructor(private readonly bookRepository: IBookRepository) {}

  /**
   * Creates a new Book using domain rules.
   * This method instantiates a new Book entity (which performs validations in its constructor)
   * and persists it using the repository.
   *
   * @param data - Object containing book details.
   * @returns The created Book entity.
   */
  async createBook(data: BookRequest): Promise<Book> {
    // Check if the book already exists.
    const referencedBook = await this.getBookByISBN(data.isbn)

    // If the book already exists, throw an error.
    if (referencedBook) {
      throw new Errors.ApplicationError(
        400,
        'BOOK_ALREADY_EXISTS',
        `Book with isbn ${data.isbn} already exists.`,
      )
    }

    // Instantiate a new Book domain entity.
    // If any business rule is violated, the constructor should throw an error.
    const book = Book.create(data)

    // Persist the book using the repository.
    await this.bookRepository.create(book)

    return book
  }

  /**
   * Retrieves a book by its unique identifier.
   *
   * @param isbn - The book's unique identifier.
   * @returns The found Book entity, or null if not found.
   */
  async getBookByISBN(isbn: Book['isbn']): Promise<Book | null> {
    const book = await this.bookRepository.findByISBN(isbn)

    // If the book is not found, throw an error.
    if (!book) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${isbn} not found.`,
      )
    }

    return book
  }

  /**
   * Deletes a book by its unique identifier.
   *
   * @param isbn - The book's unique identifier.
   * @returns True if the deletion was successful, false otherwise.
   */
  async deleteBookByISBN(isbn: Book['isbn']): Promise<boolean> {
    try {
      await this.bookRepository.deleteByISBN(isbn)
    } catch (error) {
      throw new Errors.ApplicationError(
        500,
        'BOOK_DELETION_FAILED',
        `Failed to delete book with isbn ${isbn}.`,
      )
    }

    return true
  }
}
