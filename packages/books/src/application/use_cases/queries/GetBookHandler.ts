import { Book } from '@book-library-tool/sdk'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
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
      throw new Error(`Book with ISBN ${command.isbn} not found.`)
    }

    return book
  }
}
