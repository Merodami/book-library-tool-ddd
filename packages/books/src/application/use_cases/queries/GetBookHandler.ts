import { schemas } from '@book-library-tool/api'
import { Book } from '@book-library-tool/sdk'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import type { GetBookQuery } from '@books/queries/GetBookQuery.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'

export class GetBookHandler {
  constructor(
    private readonly projectionRepository: IBookProjectionRepository,
  ) {}

  /**
   * Retrieves a Book by its unique identifier (ID) by loading its events and rehydrating its state.
   *
   * @param id - The Book's unique identifier.
   * @param fields - Optional list of fields to include in the result
   * @returns The rehydrated Book aggregate.
   */
  async execute(
    command: GetBookQuery,
    fields?: schemas.BookSortField[],
  ): Promise<Book> {
    try {
      const book = await this.projectionRepository.getBookById(
        command.id,
        fields,
      )

      if (!book) {
        throw new Errors.ApplicationError(
          404,
          ErrorCode.BOOK_NOT_FOUND,
          `Book with ID ${command.id} not found`,
        )
      }

      return book
    } catch (err) {
      logger.error(`Error retrieving book with ID ${command.id}:`, err)
      throw err
    }
  }
}
