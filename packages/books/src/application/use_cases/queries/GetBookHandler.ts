import { Book } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'

import { GetBookQuery } from './GetBookQuery.js'

export class GetBookHandler {
  constructor(
    private readonly projectionRepository: IBookProjectionRepository,
  ) {}

  /**
   * Retrieves a Book by its unique identifier (ISBN) by loading its events and rehydrating its state.
   *
   * @param isbn - The Book's unique identifier.
   * @returns The rehydrated Book aggregate.
   */
  async execute(command: GetBookQuery): Promise<Book> {
    const book = await this.projectionRepository.getBookByISBN(command.isbn)

    if (!book) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ISBN ${command.isbn} not found`,
      )
    }

    return book
  }
}
