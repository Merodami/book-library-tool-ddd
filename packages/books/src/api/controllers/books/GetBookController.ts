import { Cache } from '@book-library-tool/redis'
import { GetBookHandler } from '@books/queries/GetBookHandler.js'
import type { GetBookQuery } from '@books/queries/GetBookQuery.js'
import type { FastifyReply, FastifyRequest } from 'fastify'

export class GetBookController {
  constructor(private readonly getBookHandler: GetBookHandler) {
    this.getBook = this.getBook.bind(this)
  }

  /**
   * GET /books/:isbn
   * Retrieves a book by ISBN.
   */
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'book:details',
    condition: (result) => result !== null,
  })
  async getBook(
    request: FastifyRequest<{
      Params: { isbn: string }
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { isbn } = request.params

    const query: GetBookQuery = {
      isbn,
    }

    // Call the handler directly to get the book
    const book = await this.getBookHandler.execute(query)

    // Respond with a 200 status code and the book data
    reply.code(200).send(book)
  }
}
