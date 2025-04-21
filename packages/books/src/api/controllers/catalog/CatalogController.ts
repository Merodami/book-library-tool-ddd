import { schemas } from '@book-library-tool/api'
import { parseAndValidate } from '@book-library-tool/http'
import { Cache, httpRequestKeyGenerator } from '@book-library-tool/redis'
import { GetAllBooksHandler } from '@books/queries/GetAllBooksHandler.js'
import type { FastifyRequest } from 'fastify'

export class CatalogController {
  constructor(private readonly getAllBooksHandler: GetAllBooksHandler) {
    this.getAllBooks = this.getAllBooks.bind(this)
  }

  /**
   * GET /catalog
   * Returns a paginated list of books with optional field selection.
   */
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'catalog',
    keyGenerator: httpRequestKeyGenerator,
    condition: (result) => result && result.data && Array.isArray(result.data),
  })
  async getAllBooks(
    request: FastifyRequest,
  ): Promise<schemas.PaginatedResult<schemas.BookDTO>> {
    const query = request.query as schemas.CatalogSearchQuery

    const validFields = parseAndValidate<schemas.BookSortField>(
      query.fields,
      schemas.ALLOWED_BOOK_FIELDS,
    )

    const result = await this.getAllBooksHandler.execute(
      query,
      validFields || undefined,
    )

    return result
  }
}
