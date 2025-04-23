import { schemas } from '@book-library-tool/api'
import { parseAndValidate } from '@book-library-tool/http'
import { Cache, httpRequestKeyGenerator } from '@book-library-tool/redis'
import { Book as Book } from '@book-library-tool/sdk'
import { GetBookHandler } from '@books/queries/GetBookHandler.js'
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
      Params: schemas.IdParameter
      Querystring: schemas.CatalogSearchQuery
    }>,
  ): Promise<Book> {
    const { id } = request.params

    const query = request.query as schemas.CatalogSearchQuery

    const validFields = parseAndValidate<schemas.BookSortField>(
      query.fields,
      schemas.ALLOWED_BOOK_FIELDS,
    )

    const result = await this.getBookHandler.execute(
      {
        id,
      },
      validFields || undefined,
    )

    return result
  }
}
