import type {
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'

export class GetAllBooksHandler {
  constructor(
    private readonly projectionRepository: IBookProjectionRepository,
  ) {}

  /**
   * Retrieves all books from the repository.
   * This method is useful for listing all available books.
   *
   * @param query - The search query parameters
   * @param fields - Optional array of fields to return
   * @returns A paginated response of Book objects
   */
  async execute(
    query: CatalogSearchQuery,
    fields?: string[],
  ): Promise<PaginatedBookResponse> {
    // Retrieve all events for the given aggregate ID.
    const books = await this.projectionRepository.getAllBooks(query, fields)

    if (!books || books.data.length === 0) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `No books found.`,
      )
    }

    return books
  }
}
