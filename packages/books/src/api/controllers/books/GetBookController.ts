import { Cache, httpRequestKeyGenerator } from '@book-library-tool/redis'
import { Book as BookDTO } from '@book-library-tool/sdk'
import { GetBookHandler } from '@books/queries/GetBookHandler.js'
import type { GetBookQuery } from '@books/queries/GetBookQuery.js'
import type { FastifyRequest } from 'fastify'

export class GetBookController {
  constructor(private readonly getBookHandler: GetBookHandler) {
    this.getBook = this.getBook.bind(this)
  }

  /**
   * GET /books/:id
   * Retrieves a book by ID.
   */
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'book',
    keyGenerator: httpRequestKeyGenerator,
    condition: (result) => result !== null,
  })
  async getBook(
    request: FastifyRequest<{
      Params: { id: string }
    }>,
  ): Promise<BookDTO> {
    const { id } = request.params

    // Get fields from query parameters if provided
    const query = request.query as { fields?: string }

    // Parse fields if provided, otherwise undefined
    const fields = query.fields?.split(',')

    // Validate requested fields against allowed set
    const allowedFields = [
      'id',
      'isbn',
      'title',
      'author',
      'publicationYear',
      'publisher',
      'price',
      'createdAt',
      'updatedAt',
    ]
    const validFields = fields?.filter((field) => allowedFields.includes(field))

    const bookQuery: GetBookQuery = {
      id,
    }

    // Pass fields to the handler
    const result = await this.getBookHandler.execute(bookQuery, validFields)

    return result
  }
}
