import { schemas } from '@book-library-tool/api'
import { paginationHook } from '@book-library-tool/http'
import { CatalogController } from '@books/api/index.js'
import { GetAllBooksHandler } from '@books/application/index.js'
import { IBookReadProjectionRepository } from '@books/domain/index.js'
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'

/**
 * Creates a Fastify plugin for catalog operations.
 * Provides endpoints for searching and browsing the book catalog.
 *
 * @param {IBookReadProjectionRepository} bookReadProjectionRepository - Repository for reading book projections
 * @returns {FastifyPluginAsync} Configured Fastify plugin with catalog endpoints
 */
export function createCatalogRouter(
  bookReadProjectionRepository: IBookReadProjectionRepository,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    // Query handler for retrieving books
    const getHandler = new GetAllBooksHandler(bookReadProjectionRepository)

    // Controller that handles HTTP requests and delegates to the handler
    const catalogController = new CatalogController(getHandler)

    /**
     * GET /catalog
     * Retrieves a list of books with optional search parameters and field selection.
     *
     * @route GET /
     * @param {CatalogSearchQuery} req.query - Optional search parameters and fields to return
     * @returns {PaginatedResult<Book>} List of books matching the search criteria
     */
    fastify.get<{
      Querystring: schemas.CatalogSearchQuery
    }>(
      '/',
      {
        onRequest: [paginationHook],
        schema: {
          querystring: schemas.CatalogSearchQuerySchema,
        },
      },
      async (
        request: FastifyRequest<{ Querystring: schemas.CatalogSearchQuery }>,
        reply,
      ) => {
        const result = await catalogController.getAllBooks(request)

        reply.code(200).send(result)
      },
    )
  }
}
