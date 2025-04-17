import type { UpdateBookCommand } from '@commands/UpdateBookCommand.js'
import { UpdateBookHandler } from '@commands/UpdateBookHandler.js'
import { FastifyReply, FastifyRequest } from 'fastify'

export class UpdateBookController {
  constructor(private readonly updateBookHandler: UpdateBookHandler) {
    this.updateBook = this.updateBook.bind(this)
  }

  /**
   * PATCH /books/:isbn
   * Partially updates a book. Generates a BookUpdated event,
   * persists it, and publishes it.
   */
  async updateBook(
    request: FastifyRequest<{
      Params: { isbn: string }
      Body: Omit<UpdateBookCommand, 'isbn'>
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { isbn } = request.params
    const { title, author, publicationYear, publisher, price } = request.body

    const command: UpdateBookCommand = {
      isbn,
      title,
      author,
      publicationYear,
      publisher,
      price,
    }

    // Call the handler directly to update the book
    await this.updateBookHandler.execute(command)

    // Respond with a 200 status code
    reply
      .code(200)
      .send({ message: 'Book updated successfully', book: command })
  }
}
