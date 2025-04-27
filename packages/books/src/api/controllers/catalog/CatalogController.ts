import { schemas } from '@book-library-tool/api'
import { parseAndValidate } from '@book-library-tool/http'
import { Cache, httpRequestKeyGenerator } from '@book-library-tool/redis'
import { BookSortField, BookSortFieldEnum } from '@book-library-tool/sdk'
import { GetAllBooksHandler, toApiBook } from '@books/application/index.js'
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
    request: FastifyRequest<{
      Querystring: schemas.CatalogSearchQuery
    }>,
  ): Promise<schemas.PaginatedResult<schemas.Book>> {
    const query = request.query as schemas.CatalogSearchQuery

    let validFields: BookSortField[] | null = null

    if (query.fields && typeof query.fields === 'string') {
      const allowed = Object.values(BookSortFieldEnum)

      validFields = parseAndValidate<BookSortField>(query.fields, allowed)
    }

    const result = await this.getAllBooksHandler.execute(
      query,
      validFields || undefined,
    )

    return {
      data: result.data.map(toApiBook),
      pagination: result.pagination,
    }
  }
}
