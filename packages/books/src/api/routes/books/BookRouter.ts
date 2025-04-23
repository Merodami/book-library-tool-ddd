import { schemas } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { CreateBookHandler } from '@books/commands/CreateBookHandler.js'
import { DeleteBookHandler } from '@books/commands/DeleteBookHandler.js'
import { UpdateBookCommand } from '@books/commands/UpdateBookCommand.js'
import { UpdateBookHandler } from '@books/commands/UpdateBookHandler.js'
import { CreateBookController } from '@books/controllers/books/CreateBookController.js'
import { DeleteBookController } from '@books/controllers/books/DeleteBookController.js'
import { GetBookController } from '@books/controllers/books/GetBookController.js'
import { UpdateBookController } from '@books/controllers/books/UpdateBookController.js'
import { GetBookHandler } from '@books/queries/GetBookHandler.js'
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'

import { IBookReadProjectionRepository } from '../../../domain/repositories/IBookReadProjectionRepository.js'
import { IBookReadRepository } from '../../../domain/repositories/IBookReadRepository.js'
import { IBookWriteRepository } from '../../../domain/repositories/IBookWriteRepository.js'

/**
 * Creates and configures a Fastify plugin for book-related endpoints.
 * This plugin handles CRUD operations for books including creation, updates,
 * deletion, and retrieval of book information.
 *
 * @param {IBookWriteRepository} bookWriteRepository - Repository for managing book data
 * @param {IBookReadRepository} bookReadRepository - Repository for reading book data
 * @param {IBookReadProjectionRepository} projectionReadRepository - Repository for reading book projections
 * @param {EventBus} eventBus - Event bus for publishing domain events
 * @returns {FastifyPluginAsync} Configured Fastify plugin with book-related endpoints
 *
 * @example
 * const plugin = createBookRouter(bookRepo, projectionRepo, eventBus);
 * app.register(plugin, { prefix: '/books' });
 */
export function createBookRouter(
  bookWriteRepository: IBookWriteRepository,
  bookReadRepository: IBookReadRepository,
  projectionReadRepository: IBookReadProjectionRepository,
  eventBus: EventBus,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    // Instantiate individual handlers
    const createHandler = new CreateBookHandler(bookWriteRepository, eventBus)
    const updateHandler = new UpdateBookHandler(bookWriteRepository, eventBus)
    const deleteHandler = new DeleteBookHandler(
      bookReadRepository,
      bookWriteRepository,
      eventBus,
    )

    const getHandler = new GetBookHandler(projectionReadRepository)

    // Create specialized controllers
    const createBookController = new CreateBookController(createHandler)
    const updateBookController = new UpdateBookController(updateHandler)
    const deleteBookController = new DeleteBookController(deleteHandler)
    const getBookController = new GetBookController(getHandler)

    // Define routes

    /**
     * POST /books
     * Creates a new book in the system.
     *
     * @route POST /
     * @param {BookCreateRequest} req.body - Book creation data
     * @returns {Book} The created book
     */
    fastify.post<{
      Body: schemas.BookCreateRequest
    }>(
      '/',
      {
        schema: {
          body: schemas.BookCreateRequestSchema,
        },
      },
      async (
        request: FastifyRequest<{ Body: schemas.BookCreateRequest }>,
        reply,
      ) => {
        const result = await createBookController.createBook(request)

        reply.code(200).send(result)
      },
    )

    /**
     * PATCH /books/:id
     * Updates an existing book's information.
     *
     * @route PATCH /:id
     * @param {string} req.params.id - ID of the book to update
     * @param {BookUpdateRequest} req.body - Book update data
     * @returns {Book} The updated book
     */
    fastify.patch<{
      Params: schemas.IdParameter
      Body: Omit<UpdateBookCommand, 'id'>
    }>(
      '/:id',
      {
        schema: {
          params: schemas.IdParameterSchema,
          body: schemas.BookUpdateRequestSchema,
        },
      },
      async (
        request: FastifyRequest<{
          Params: schemas.IdParameter
          Body: Omit<UpdateBookCommand, 'id'>
        }>,
        reply,
      ) => {
        const result = await updateBookController.updateBook(request)

        reply.code(200).send(result)
      },
    )

    /**
     * DELETE /books/:id
     * Removes a book from the system.
     *
     * @route DELETE /:id
     * @param {string} req.params.id - ID of the book to delete
     * @returns {void}
     */
    fastify.delete<{
      Params: schemas.IdParameter
    }>(
      '/:id',
      {
        schema: {
          params: schemas.IdParameterSchema,
        },
      },
      async (
        request: FastifyRequest<{ Params: schemas.IdParameter }>,
        reply,
      ) => {
        const result = await deleteBookController.deleteBook(request)

        reply.code(200).send(result)
      },
    )

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
