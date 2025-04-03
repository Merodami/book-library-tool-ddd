import { Book } from '../../../domain/src/books/entities/Book.js'
import { IBookRepository } from '../../../domain/src/books/repositories/BookRepository.js'

export interface BookCreationData {
  id: string
  title: string
  author: string
  publicationYear: number
  publisher: string
  price: number
}

export class BookService {
  constructor(private readonly bookRepository: IBookRepository) {}

  /*
   ** Use cases
   */

  /**
   * Creates a new Book using domain rules.
   * This method instantiates a new Book entity (which performs validations in its constructor)
   * and persists it using the repository.
   *
   * @param data - Object containing book details.
   * @returns The created Book entity.
   */
  async createBook(data: BookCreationData): Promise<Book> {
    // Instantiate a new Book domain entity.
    // If any business rule is violated, the constructor should throw an error.
    const book = new Book(
      data.id,
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
   * @param id - The book's unique identifier.
   * @returns The found Book entity, or null if not found.
   */
  async getBookById(id: string): Promise<Book | null> {
    return this.bookRepository.findById(id)
  }

  /**
   * Deletes a book by its unique identifier.
   *
   * @param id - The book's unique identifier.
   * @returns True if the deletion was successful, false otherwise.
   */
  async deleteBookById(id: string): Promise<boolean> {
    return this.bookRepository.deleteById(id)
  }
}
