import { schemas } from '@book-library-tool/api'
import { EventResponse } from '@book-library-tool/sdk'
import type { UpdateBookCommand } from '@books/commands/UpdateBookCommand.js'
import { UpdateBookHandler } from '@books/commands/UpdateBookHandler.js'
import { FastifyRequest } from 'fastify'

export class UpdateBookController {
  constructor(private readonly updateBookHandler: UpdateBookHandler) {
    this.updateBook = this.updateBook.bind(this)
  }

  /**
   * PATCH /books/:id
   * Partially updates a book. Generates a BookUpdated event,
   * persists it, and publishes it.
   */
  async updateBook(
    request: FastifyRequest<{
      Params: schemas.IdParameter
      Body: Omit<UpdateBookCommand, 'id'>
    }>,
  ): Promise<EventResponse & { bookId: string }> {
    const { id } = request.params
    const { title, author, publicationYear, publisher, price } = request.body

    const command: UpdateBookCommand = {
      id,
      title,
      author,
      publicationYear,
      publisher,
      price,
    }

    const result = await this.updateBookHandler.execute(command)

    return result
  }
}
