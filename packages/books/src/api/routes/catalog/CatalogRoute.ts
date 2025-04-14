import { schemas, validateQuery } from '@book-library-tool/api'
import { CatalogController } from '@books/controllers/catalog/CatalogController.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { GetAllBooksHandler } from '@books/use_cases/queries/GetAllBooksHandler.js'
import { Router } from 'express'

/**
 * Creates an Express router for catalog operations.
 * Provides endpoints for searching and browsing the book catalog.
 *
 * @param {IBookProjectionRepository} bookProjectionRepository - Repository for reading book projections
 * @returns {Router} Configured Express router with catalog endpoints
 */
export function createCatalogRouter(
  bookProjectionRepository: IBookProjectionRepository,
) {
  const router = Router()

  // Query handler for retrieving books
  const getHandler = new GetAllBooksHandler(bookProjectionRepository)

  // Controller that handles HTTP requests and delegates to the handler
  const createHandler = new CatalogController(getHandler)

  /**
   * GET /catalog
   * Retrieves a list of books with optional search parameters.
   *
   * @route GET /
   * @param {CatalogSearchQuery} req.query - Optional search parameters
   * @returns {Book[]} List of books matching the search criteria
   */
  router.get(
    '/',
    validateQuery(schemas.CatalogSearchQuerySchema),
    createHandler.getAllBooks,
  )

  return router
}
