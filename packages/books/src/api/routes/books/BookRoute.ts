import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
// Command (write) handlers:
import { CreateBookHandler } from '@commands/CreateBookHandler.js'
import { DeleteBookHandler } from '@commands/DeleteBookHandler.js'
import { UpdateBookHandler } from '@commands/UpdateBookHandler.js'
import { BookController } from '@controllers/books/BookController.js'
// Unified facade and controller:
import { BookFacade } from '@controllers/books/BookFacade.js'
// Query (read) handler:
import { GetBookHandler } from '@queries/GetBookHandler.js'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
import type { IBookRepository } from '@repositories/IBookRepository.js'
import { Router } from 'express'

// The router now expects both the write repository and the projection repository as parameters.
export function createBookRouter(
  bookRepository: IBookRepository,
  bookProjectionRepository: IBookProjectionRepository,
  eventBus: EventBus,
) {
  const router = Router()

  // Instantiate individual handlers:
  const createHandler = new CreateBookHandler(bookRepository, eventBus)
  const updateHandler = new UpdateBookHandler(bookRepository, eventBus)
  const deleteHandler = new DeleteBookHandler(bookRepository, eventBus)

  // The query (read) handler uses the projection repository.
  const getHandler = new GetBookHandler(bookProjectionRepository)

  // Create a unified facade combining all the handlers:
  const facade = new BookFacade(
    createHandler,
    updateHandler,
    deleteHandler,
    getHandler,
  )

  // Create a single controller that delegates operations to the facade:
  const controller = new BookController(facade)

  router.post(
    '/',
    validateBody(schemas.BookCreateRequestSchema),
    controller.createBook,
  )

  router.patch(
    '/:isbn',
    validateParams(schemas.BookIdSchema),
    validateBody(schemas.BookUpdateRequestSchema),
    controller.updateBook,
  )

  router.get('/:isbn', validateParams(schemas.BookIdSchema), controller.getBook)

  router.delete(
    '/:isbn',
    validateParams(schemas.BookIdSchema),
    controller.deleteBook,
  )

  return router
}
