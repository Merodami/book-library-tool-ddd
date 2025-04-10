import { Request, Response, NextFunction } from 'express'
import { CatalogSearchQuery } from '@book-library-tool/sdk'
import { GetAllBooksHandler } from '@use_cases/queries/GetAllBooksHandler.js'

export class CatalogController {
  constructor(private readonly catalogService: GetAllBooksHandler) {
    this.getAllBooks = this.getAllBooks.bind(this)
  }

  /**
   * GET /books
   * Retrieves all books in the catalog.
   * Expects query parameters for pagination:
   * - page: number
   * - limit: number
   * Returns a paginated list of books.
   */
  async getAllBooks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { title, author, publicationYear, page, limit } =
        req.query as CatalogSearchQuery

      // Delegate to the service; the service will enforce business rules.
      const books = await this.catalogService.execute({
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
