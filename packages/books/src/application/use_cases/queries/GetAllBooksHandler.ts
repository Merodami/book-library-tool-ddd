import { BookDTO } from '@book-library-tool/api/src/schemas/books.js'
import { Errors } from '@book-library-tool/shared'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
import { GetAllBooksQuery } from './GetAllBooksQuery.js'

export class GetAllBooksHandler {
  constructor(private readonly bookRepository: IBookProjectionRepository) {}

  /**
   * Retrieves all books from the repository.
   * This method is useful for listing all available books.
   *
   * @returns An array of Book aggregates.
   */
  async execute(query: GetAllBooksQuery): Promise<BookDTO[]> {
    // Retrieve all events for the given aggregate ID.
    const books = await this.bookRepository.getAllBooks(query)

    if (!books || books.length === 0) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `No books found.`,
      )
    }

    return books
  }
}
