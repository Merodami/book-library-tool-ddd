import { schemas } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { CreateBookHandler } from '@books/commands/CreateBookHandler.js'
import { DeleteBookHandler } from '@books/commands/DeleteBookHandler.js'
import { UpdateBookHandler } from '@books/commands/UpdateBookHandler.js'
import { CreateBookController } from '@books/controllers/books/CreateBookController.js'
import { DeleteBookController } from '@books/controllers/books/DeleteBookController.js'
import { GetBookController } from '@books/controllers/books/GetBookController.js'
import { UpdateBookController } from '@books/controllers/books/UpdateBookController.js'
import { GetBookHandler } from '@books/queries/GetBookHandler.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import type { IBookRepository } from '@books/repositories/IBookRepository.js'
import { FastifyInstance, FastifyPluginAsync } from 'fastify'

/**
 * Creates and configures a Fastify plugin for book-related endpoints.
 * This plugin handles CRUD operations for books including creation, updates,
 * deletion, and retrieval of book information.
 *
 * @param {IBookRepository} bookRepository - Repository for managing book data
 * @param {IBookProjectionRepository} bookProjectionRepository - Repository for reading book projections
 * @param {EventBus} eventBus - Event bus for publishing domain events
 * @returns {FastifyPluginAsync} Configured Fastify plugin with book-related endpoints
 *
 * @example
 * const plugin = createBookRouter(bookRepo, projectionRepo, eventBus);
 * app.register(plugin, { prefix: '/books' });
 */
export function createBookRouter(
  bookRepository: IBookRepository,
  bookProjectionRepository: IBookProjectionRepository,
  eventBus: EventBus,
): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    // Instantiate individual handlers
    const createHandler = new CreateBookHandler(bookRepository, eventBus)
    const updateHandler = new UpdateBookHandler(bookRepository, eventBus)
    const deleteHandler = new DeleteBookHandler(bookRepository, eventBus)
    const getHandler = new GetBookHandler(bookProjectionRepository)

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
    fastify.post(
      '/',
      {
        schema: {
          body: schemas.BookCreateRequestSchema,
        },
      },
      createBookController.createBook,
    )

    /**
     * PATCH /books/:isbn
     * Updates an existing book's information.
     *
     * @route PATCH /:isbn
     * @param {string} req.params.isbn - ISBN of the book to update
     * @param {BookUpdateRequest} req.body - Book update data
     * @returns {Book} The updated book
     */
    fastify.patch(
      '/:isbn',
      {
        schema: {
          params: schemas.BookIdParameterSchema,
          body: schemas.BookUpdateRequestSchema,
        },
      },
      updateBookController.updateBook,
    )

    /**
     * DELETE /books/:isbn
     * Removes a book from the system.
     *
     * @route DELETE /:isbn
     * @param {string} req.params.isbn - ISBN of the book to delete
     * @returns {void}
     */
    fastify.delete(
      '/:isbn',
      {
        schema: {
          params: schemas.BookIdParameterSchema,
        },
      },
      deleteBookController.deleteBook,
    )

    /**
     * GET /books/:isbn
     * Retrieves a book's information.
     *
     * @route GET /:isbn
     * @param {string} req.params.isbn - ISBN of the book to retrieve
     * @returns {Book} The requested book
     */
    fastify.get(
      '/:isbn',
      {
        schema: {
          params: schemas.BookIdParameterSchema,
        },
      },
      getBookController.getBook,
    )
  }
}
