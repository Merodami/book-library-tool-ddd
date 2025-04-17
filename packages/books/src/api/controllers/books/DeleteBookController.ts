import { DeleteBookHandler } from '@commands/DeleteBookHandler.js'
import { FastifyReply, FastifyRequest } from 'fastify'

export class DeleteBookController {
  constructor(private readonly deleteBookHandler: DeleteBookHandler) {
    this.deleteBook = this.deleteBook.bind(this)
  }

  /**
   * DELETE /books/:isbn
   * Deletes a book reference by its ISBN.
   * The deletion is handled as a soft delete that generates a BookDeleted event.
   */
  async deleteBook(
    request: FastifyRequest<{
      Params: { isbn: string }
    }>,
    reply: FastifyReply,
  ) {
    const { isbn } = request.params

    await this.deleteBookHandler.execute({ isbn })

    return reply.code(200).send({ message: 'Book deleted successfully' })
  }
}
