import { schemas } from '@book-library-tool/api'
import { paginationHook } from '@book-library-tool/http'
import { CatalogController } from '@books/controllers/catalog/CatalogController.js'
import { GetAllBooksHandler } from '@books/queries/GetAllBooksHandler.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'

/**
 * Creates a Fastify plugin for catalog operations.
 * Provides endpoints for searching and browsing the book catalog.
 *
 * @param {IBookProjectionRepository} bookProjectionRepository - Repository for reading book projections
 * @returns {FastifyPluginAsync} Configured Fastify plugin with catalog endpoints
 */
export function createCatalogRouter(
  bookProjectionRepository: IBookProjectionRepository,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
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
     * @returns {PaginatedResult<BookDTO>} List of books matching the search criteria
     */
    fastify.get(
      '/',
      {
        onRequest: [paginationHook],
        schema: {
          querystring: schemas.CatalogSearchQuerySchema,
        },
      },
      async (request: FastifyRequest) => {
        const result = await catalogController.getAllBooks(request)

        return result
      },
    )
  }
}
