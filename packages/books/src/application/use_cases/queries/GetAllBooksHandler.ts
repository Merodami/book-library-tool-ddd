import { PaginatedBookResponse } from '@book-library-tool/sdk'
import { Errors } from '@book-library-tool/shared'
import { GetAllBooksQuery } from '@books/queries/GetAllBooksQuery.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'

export class GetAllBooksHandler {
  constructor(
    private readonly projectionRepository: IBookProjectionRepository,
  ) {}

  /**
   * Retrieves all books from the repository.
   * This method is useful for listing all available books.
   *
   * @returns An array of Book aggregates.
   */
  async execute(query: GetAllBooksQuery): Promise<PaginatedBookResponse> {
    // Retrieve all events for the given aggregate ID.
    const books = await this.projectionRepository.getAllBooks(query)

    if (!books || books.data.length === 0) {
      throw new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `No books found.`,
      )
    }

    return books
  }
}
