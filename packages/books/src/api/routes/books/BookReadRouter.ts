import { schemas } from '@book-library-tool/api'
import { GetBookController } from '@books/api/index.js'
import { GetBookHandler } from '@books/application/index.js'
import { BookReadProjectionRepositoryPort } from '@books/domain/index.js'
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'

/**
 * Creates and configures a Fastify plugin for book read operations.
 * This plugin handles query operations for books including retrieval of book information.
 *
 * @param {BookReadProjectionRepositoryPort} bookProjectionReadyRepository - Repository for reading book projections
 * @returns {FastifyPluginAsync} Configured Fastify plugin with book read endpoints
 *
 * @example
 * const plugin = createBookReadRouter(projectionRepo);
 * app.register(plugin, { prefix: '/books' });
 */
export function createBookReadRouter(
  bookProjectionReadyRepository: BookReadProjectionRepositoryPort,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    // Instantiate individual handlers
    const getHandler = new GetBookHandler(bookProjectionReadyRepository)

    // Create specialized controllers
    const getBookController = new GetBookController(getHandler)

    // Define routes

    /**
     * GET /books/:id
     * Retrieves a book's information.
     *
     * @route GET /:id
     * @param {string} req.params.id - ID of the book to retrieve
     * @returns {Book} The requested book
     */
    fastify.get<{
      Params: schemas.IdParameter
      Querystring: schemas.CatalogSearchQuery
    }>(
      '/:id',
      {
        schema: {
          params: schemas.IdParameterSchema,
          querystring: schemas.CatalogSearchQuerySchema,
        },
      },
      async (
        request: FastifyRequest<{
          Params: schemas.IdParameter
          Querystring: schemas.CatalogSearchQuery
        }>,
        reply,
      ) => {
        const result = await getBookController.getBook(request)

        reply.code(200).send(result)
      },
    )
  }
}
