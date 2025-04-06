import { BookRequest } from '@book-library-tool/sdk'
import { Book } from '../../domain/entities/Book.js'
import { IBookRepository } from '../../domain/repositories/IBookRepository.js'

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
    // Instantiate a new Book domain entity.
    // If any business rule is violated, the constructor should throw an error.
    const book = new Book(
      data.isbn,
      data.title,
      data.author,
      data.publicationYear,
      data.publisher,
      data.price,
    )

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
    if (!isbn) {
      throw new Error('ISBN cannot be empty')
    }

    return this.bookRepository.findByISBN(isbn)
  }

  /**
   * Deletes a book by its unique identifier.
   *
   * @param id - The book's unique identifier.
   * @returns True if the deletion was successful, false otherwise.
   */
  async deleteBookByISBN(isbn: Book['isbn']): Promise<boolean> {
    if (!isbn) {
      throw new Error('ISBN cannot be empty')
    }

    return this.bookRepository.deleteByISBN(isbn)
  }

  /**
   * Updates the title of a book.
   *
   * @param isbn - The book's unique identifier.
   * @param newTitle - The new title for the book.
   * @returns The updated Book entity.
   */
  // async updateBookTitle(isbn: string, newTitle: string): Promise<Book> {
  //   const book = await this.bookRepository.findByISBN(isbn)

  //   if (!book) {
  //     throw new Error('Book not found')
  //   }

  //   book.updateTitle(newTitle)

  //   await this.bookRepository.update(book)

  //   return book
  // }
}
