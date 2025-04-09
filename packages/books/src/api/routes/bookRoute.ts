import { Router } from 'express'
import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import { BookController } from '@controllers/bookController.js'

export function createBookRouter(bookController: BookController) {
  const router = Router()

  router.post(
    '/',
    validateBody(schemas.BookCreateRequestSchema),
    bookController.createBook,
  )
  router.patch(
    '/:isbn',
    validateBody(schemas.BookUpdateRequestSchema),
    bookController.updateBook,
  )
  router.get(
    '/:isbn',
    validateParams(schemas.BookIdSchema),
    bookController.getBook,
  )
  router.delete(
    '/:isbn',
    validateParams(schemas.BookIdSchema),
    bookController.deleteBook,
  )

  return router
}
