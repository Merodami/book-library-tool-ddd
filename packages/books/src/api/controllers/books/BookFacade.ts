import { Book } from '@book-library-tool/sdk'
import { CreateBookCommand } from '@commands/CreateBookCommand.js'
import { CreateBookHandler } from '@commands/CreateBookHandler.js'
import { DeleteBookCommand } from '@commands/DeleteBookCommand.js'
import { DeleteBookHandler } from '@commands/DeleteBookHandler.js'
import { UpdateBookCommand } from '@commands/UpdateBookCommand.js'
import { UpdateBookHandler } from '@commands/UpdateBookHandler.js'
import { GetBookHandler } from '@queries/GetBookHandler.js'
import { GetBookQuery } from '@queries/GetBookQuery.js'

// Unified BookFacade that delegates to the correct underlying handler:
export class BookFacade {
  constructor(
    private readonly createHandler: CreateBookHandler,
    private readonly updateHandler: UpdateBookHandler,
    private readonly deleteHandler: DeleteBookHandler,
    private readonly getHandler: GetBookHandler,
  ) {}

  async createBook(command: CreateBookCommand): Promise<void> {
    await this.createHandler.execute(command)
  }

  async updateBook(command: UpdateBookCommand): Promise<void> {
    await this.updateHandler.execute(command)
  }

  async deleteBook(isbn: DeleteBookCommand): Promise<void> {
    await this.deleteHandler.execute(isbn)
  }

  async getBook(isbn: GetBookQuery): Promise<Book> {
    return await this.getHandler.execute(isbn)
  }
}
