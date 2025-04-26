import { schemas } from '@book-library-tool/api'
import type { EventBusPort } from '@book-library-tool/event-store'
import {
  CreateBookController,
  DeleteBookController,
  UpdateBookController,
} from '@books/api/index.js'
import {
  CreateBookHandler,
  DeleteBookHandler,
  UpdateBookCommand,
  UpdateBookHandler,
} from '@books/application/index.js'
import { BookReadProjectionRepositoryPort } from '@books/domain/index.js'
import { BookWriteRepositoryPort } from '@books/domain/index.js'
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'

/**
 * Creates and configures a Fastify plugin for book write operations.
 * This plugin handles command operations for books including creation, updates,
 * and deletion of book information.
 *
 * @param {BookWriteRepositoryPort} bookWriteRepository - Repository for managing book data
 * @param {BookReadProjectionRepositoryPort} bookProjectionReadyRepository - Repository for reading book projections
 * @param {EventBusPort} eventBus - Event bus for publishing domain events
 * @returns {FastifyPluginAsync} Configured Fastify plugin with book write endpoints
 *
 * @example
 * const plugin = createBookWriteRouter(bookRepo, projectionRepo, eventBus);
 * app.register(plugin, { prefix: '/books' });
 */
export function createBookWriteRouter(
  bookWriteRepository: BookWriteRepositoryPort,
  bookProjectionReadyRepository: BookReadProjectionRepositoryPort,
  eventBus: EventBusPort,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    // Instantiate individual handlers
    const createHandler = new CreateBookHandler(
      bookWriteRepository,
      bookProjectionReadyRepository,
      eventBus,
    )
    const updateHandler = new UpdateBookHandler(bookWriteRepository, eventBus)
    const deleteHandler = new DeleteBookHandler(bookWriteRepository, eventBus)

    // Create specialized controllers
    const createBookController = new CreateBookController(createHandler)
    const updateBookController = new UpdateBookController(updateHandler)
    const deleteBookController = new DeleteBookController(deleteHandler)

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
  }
}
