import { CatalogSearchQuerySchema } from '@book-library-tool/api/src/schemas/catalog.js'
import { validateQuery } from '@book-library-tool/api/src/src/validation.js'
import type { CatalogSearchQuery } from '@book-library-tool/sdk'
import { Request } from 'express'

import { GetAllBooksHandler } from '../../../application/use_cases/queries/GetAllBooksHandler.js'

type ExtendedCatalogSearchQuery = Omit<CatalogSearchQuery, 'fields'> & {
  fields?: string[]
}

export class CatalogController {
  constructor(private readonly getAllBooksHandler: GetAllBooksHandler) {
    this.getAllBooks = this.getAllBooks.bind(this)
  }

  /**
   * Handles GET requests for the catalog.
   * Returns a paginated list of books with optional field selection.
   */
  async getAllBooks(
    req: Request<unknown, unknown, unknown, ExtendedCatalogSearchQuery>,
  ) {
    // Validate query parameters using the schema
    const validate = validateQuery(CatalogSearchQuerySchema)
    validate(req as any, null as any, () => {})

    const query = req.query

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
