import type { CatalogSearchQuery } from '@book-library-tool/sdk'
import { GetAllBooksHandler } from '@queries/GetAllBooksHandler.js'
import { FastifyRequest } from 'fastify'

export class CatalogController {
  constructor(private readonly getAllBooksHandler: GetAllBooksHandler) {
    this.getAllBooks = this.getAllBooks.bind(this)
  }

  /**
   * Handles GET requests for the catalog.
   * Returns a paginated list of books with optional field selection.
   */
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
