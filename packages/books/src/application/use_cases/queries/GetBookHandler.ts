import { BookSortField } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type { GetBookQuery } from '@books/application/index.js'
import type {
  BookReadProjectionRepositoryPort,
  DomainBook,
} from '@books/domain/index.js'

export class GetBookHandler {
  constructor(
    private readonly projectionReadRepository: BookReadProjectionRepositoryPort,
  ) {}

  /**
   * Retrieves a Book by its unique identifier (ID) by loading its events and rehydrating its state.
   *
   * @param id - The Book's unique identifier.
   * @param fields - Optional list of fields to include in the result
   * @returns The rehydrated Book aggregate.
   */
  async execute(
    query: GetBookQuery,
    fields?: BookSortField[],
  ): Promise<DomainBook> {
    const book = await this.projectionReadRepository.getBookById(query, fields)

    if (!book) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${query.id} not found`,
      )
    }

    return book
  }
}
