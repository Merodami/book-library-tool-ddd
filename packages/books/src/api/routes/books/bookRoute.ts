import { Router } from 'express'
import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import { BookController } from '@controllers/bookController.js'

export default function (bookController: BookController) {
  const router = Router()

  router.post(
    '/',
    // validateBody(schemas.BookRequestSchema),
    bookController.createBook,
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
