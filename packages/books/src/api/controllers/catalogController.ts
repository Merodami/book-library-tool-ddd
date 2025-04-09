import { Request, Response, NextFunction } from 'express'
import { CatalogSearchQuery } from '@book-library-tool/sdk'
import { CatalogService } from '@use_cases/CatalogService.js'

export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {
    this.getCatalog = this.getCatalog.bind(this)
  }

  /**
   * GET /books
   * Retrieves all books in the catalog.
   * Expects query parameters for pagination:
   * - page: number
   * - limit: number
   * Returns a paginated list of books.
   */
  async getCatalog(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { title, author, publicationYear, page, limit } =
        req.query as CatalogSearchQuery

      // Delegate to the service; the service will enforce business rules.
      const books = await this.catalogService.getAllBooks({
        title,
        author,
        publicationYear,
        page,
        limit,
      })

      res.status(200).json(books)
    } catch (error) {
      next(error)
    }
  }
}
