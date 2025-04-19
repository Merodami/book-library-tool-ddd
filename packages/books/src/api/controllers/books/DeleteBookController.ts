import { DeleteBookHandler } from '@books/commands/DeleteBookHandler.js'
import { FastifyRequest } from 'fastify'

export class DeleteBookController {
  constructor(private readonly deleteBookHandler: DeleteBookHandler) {
    this.deleteBook = this.deleteBook.bind(this)
  }

  /**
   * DELETE /books/:id
   * Deletes a book reference by its ID.
   * The deletion is handled as a soft delete that generates a BookDeleted event.
   */
  async deleteBook(
    request: FastifyRequest<{
      Params: { id: string }
    }>,
  ) {
    const { id } = request.params

    const result = await this.deleteBookHandler.execute({ id })

    return result
  }
}
