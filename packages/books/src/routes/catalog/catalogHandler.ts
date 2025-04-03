import { Request, Response, NextFunction } from 'express'
import { DatabaseService, getPaginatedData } from '@book-library-tool/database'
import { Book, CatalogSearchQuery } from '@book-library-tool/sdk'

export const catalogHandler = {
  /**
   * GET /books
   * Allows searching for books by title, author, or publicationYear.
   *
   * Query parameters:
   * - title (string, optional): Partial or full title (case-insensitive).
   * - author (string, optional): Partial or full author name (case-insensitive).
   * - publicationYear (number, optional): Exact publication year.
   */
  async searchCatalog(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { title, author, publicationYear } = req.query as CatalogSearchQuery

      const filter: Record<string, unknown> = {}

      if (title && typeof title === 'string' && title.trim().length > 0) {
        // Use regex for a case-insensitive search in the title field
        filter.title = { $regex: new RegExp(title.trim(), 'i') }
      }

      if (author && typeof author === 'string' && author.trim().length > 0) {
        // Use regex for a case-insensitive search in the author field
        filter.author = { $regex: new RegExp(author.trim(), 'i') }
      }

      if (publicationYear) {
        filter.publicationYear = Number(publicationYear)
      }

      const booksCollection = DatabaseService.getCollection<Book>('books')

      // Use the pagination helper to get paginated books data
      const paginatedBooks = await getPaginatedData<Book>(
        booksCollection,
        filter,
        req,
        { projection: { _id: 0 } },
      )

      res.status(200).json(paginatedBooks)
    } catch (error) {
      next(error)
    }
  },
}
