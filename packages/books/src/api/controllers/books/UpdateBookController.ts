import { schemas } from '@book-library-tool/api'
import { EventResponse } from '@book-library-tool/sdk'
import {
  UpdateBookCommand,
  UpdateBookHandler,
} from '@books/application/index.js'
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
