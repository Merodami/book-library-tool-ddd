import { CatalogSearchQuery } from '@book-library-tool/sdk'
import { GetAllBooksHandler } from '@books/use_cases/queries/GetAllBooksHandler.js'
import { NextFunction, Request, Response } from 'express'

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

      // Validate and parse query parameters
      const newPage = page ? Math.floor(Number(page)) || 1 : 1
      const newLimit = limit
        ? Math.floor(Number(limit)) ||
          Number(process.env.PAGINATION_DEFAULT_LIMIT) ||
          10
        : 10

      // Delegate to the service; the service will enforce business rules.
      const books = await this.catalogService.execute({
        title,
        author,
        publicationYear,
        page: newPage,
        limit: newLimit,
      })

      res.status(200).json(books)
    } catch (error) {
      next(error)
    }
  }
}
