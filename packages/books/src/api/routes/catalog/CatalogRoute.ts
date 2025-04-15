import { schemas, validateQuery } from '@book-library-tool/api'
import { CatalogController } from '@controllers/catalog/CatalogController.js'
import { GetAllBooksHandler } from '@queries/GetAllBooksHandler.js'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
import { Router } from 'express'
import { Request, Response } from 'express'

/**
 * Creates an Express router for catalog operations.
 * Provides endpoints for searching and browsing the book catalog.
 *
 * @param {IBookProjectionRepository} bookProjectionRepository - Repository for reading book projections
 * @returns {Router} Configured Express router with catalog endpoints
 */
export function createCatalogRouter(
  bookProjectionRepository: IBookProjectionRepository,
): Router {
  const router = Router()

  // Query handler for retrieving books
  const getHandler = new GetAllBooksHandler(bookProjectionRepository)

  // Controller that handles HTTP requests and delegates to the handler
  const catalogController = new CatalogController(getHandler)

  /**
   * GET /catalog
   * Retrieves a list of books with optional search parameters and field selection.
   *
   * @route GET /
   * @param {CatalogSearchQuery} req.query - Optional search parameters and fields to return
   * @returns {PaginatedBookResponse} List of books matching the search criteria
   */
  router.get(
    '/',
    validateQuery(schemas.CatalogSearchQuerySchema),
    async (req: Request, res: Response) => {
      const result = await catalogController.getAllBooks(req)
      res.json(result)
    },
  )

  return router
}
