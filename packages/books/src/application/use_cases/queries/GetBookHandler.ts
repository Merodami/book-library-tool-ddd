import { schemas } from '@book-library-tool/api'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { IBookReadProjectionRepository } from '@books/repositories/IBookReadProjectionRepository.js'
import { GetBookQuery } from '@books/use_cases/queries/GetBookQuery.js'

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
    fields?: schemas.BookSortField[],
  ): Promise<schemas.Book> {
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
