import { Cache } from '@book-library-tool/redis'
import type { CatalogSearchQuery } from '@book-library-tool/sdk'
import { GetAllBooksHandler } from '@queries/GetAllBooksHandler.js'
import type { FastifyRequest } from 'fastify'

export class CatalogController {
  constructor(private readonly getAllBooksHandler: GetAllBooksHandler) {
    this.getAllBooks = this.getAllBooks.bind(this)
  }

  /**
   * Handles GET requests for the catalog.
   * Returns a paginated list of books with optional field selection.
   */
  @Cache({
    ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    prefix: 'catalog:books',
    condition: (result) => result && result.data && Array.isArray(result.data),
  })
  async getAllBooks(request: FastifyRequest) {
    const query = request.query as CatalogSearchQuery

    // Convert query to CatalogSearchQuery format
    const { fields: _, ...rest } = query

    const searchQuery: CatalogSearchQuery = {
      ...rest,
      fields: query.fields,
    }

    const response = await this.getAllBooksHandler.execute(
      searchQuery,
      query.fields,
    )

    return response
  }
}
