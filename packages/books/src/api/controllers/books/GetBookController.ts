import { schemas } from '@book-library-tool/api'
import { parseAndValidate } from '@book-library-tool/http'
import { Cache, httpRequestKeyGenerator } from '@book-library-tool/redis'
import {
  BookSortField,
  BookSortFieldEnum,
  CatalogSearchQuery,
} from '@book-library-tool/sdk'
import { GetBookHandler, toApiBook } from '@books/application/index.js'
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
      Querystring: CatalogSearchQuery
    }>,
  ): Promise<schemas.Book> {
    const { id } = request.params

    const query = request.query as CatalogSearchQuery

    let validFields: BookSortField[] | null = null

    if (query.fields && typeof query.fields === 'string') {
      const allowed = Object.values(BookSortFieldEnum)

      validFields = parseAndValidate<BookSortField>(query.fields, allowed)
    }

    const result = await this.getBookHandler.execute(
      { id },
      validFields ?? undefined,
    )

    return toApiBook(result)
  }
}
