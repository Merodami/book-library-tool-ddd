import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import type { EventBus } from '@book-library-tool/event-store'
import { CreateBookHandler } from '@commands/CreateBookHandler.js'
import { DeleteBookHandler } from '@commands/DeleteBookHandler.js'
import { UpdateBookHandler } from '@commands/UpdateBookHandler.js'
import { CreateBookController } from '@controllers/books/CreateBookController.js'
import { DeleteBookController } from '@controllers/books/DeleteBookController.js'
import { GetBookController } from '@controllers/books/GetBookController.js'
import { UpdateBookController } from '@controllers/books/UpdateBookController.js'
import { GetBookHandler } from '@queries/GetBookHandler.js'
import { IBookProjectionRepository } from '@repositories/IBookProjectionRepository.js'
import type { IBookRepository } from '@repositories/IBookRepository.js'
import { Router } from 'express'

export function createBookRouter(
  bookRepository: IBookRepository,
  bookProjectionRepository: IBookProjectionRepository,
  eventBus: EventBus,
) {
  const router = Router()

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
  router.post(
    '/',
    validateBody(schemas.BookCreateRequestSchema),
    createBookController.createBook,
  )

  router.patch(
    '/:isbn',
    validateParams(schemas.BookIdSchema),
    validateBody(schemas.BookUpdateRequestSchema),
    updateBookController.updateBook,
  )

  router.delete(
    '/:isbn',
    validateParams(schemas.BookIdSchema),
    deleteBookController.deleteBook,
  )

  router.get(
    '/:isbn',
    validateParams(schemas.BookIdSchema),
    getBookController.getBook,
  )

  return router
}
