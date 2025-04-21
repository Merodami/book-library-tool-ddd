import { Cache, httpRequestKeyGenerator } from '@book-library-tool/redis'
import type { CatalogSearchQuery } from '@book-library-tool/sdk'
import { GetAllBooksHandler } from '@books/queries/GetAllBooksHandler.js'
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
    prefix: 'catalog',
    keyGenerator: httpRequestKeyGenerator,
    condition: (result) => result && result.data && Array.isArray(result.data),
  })
  async getAllBooks(request: FastifyRequest) {
    // Convert query params to CatalogSearchQuery directly
    const query = request.query as CatalogSearchQuery

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

    const validFields = query.fields?.filter((field) =>
      allowedFields.includes(field),
    )

    const result = await this.getAllBooksHandler.execute(query, validFields)

    return result
  }
}
