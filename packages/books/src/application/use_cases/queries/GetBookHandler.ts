import { BookSortField } from '@book-library-tool/sdk'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import type { GetBookQuery } from '@books/application/index.js'
import type {
  DomainBook,
  IBookReadProjectionRepository,
} from '@books/domain/index.js'

export class GetBookHandler {
  constructor(
    private readonly projectionReadRepository: IBookReadProjectionRepository,
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
    try {
      const book = await this.projectionReadRepository.getBookById(
        query,
        fields,
      )

      if (!book) {
        throw new Errors.ApplicationError(
          404,
          ErrorCode.BOOK_NOT_FOUND,
          `Book with ID ${query.id} not found`,
        )
      }

      return book
    } catch (err) {
      logger.error(`Error retrieving book with ID ${query.id}:`, err)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        'Error retrieving books catalog',
      )
    }
  }
}
