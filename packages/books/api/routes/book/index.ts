import { Router } from 'express'
import { bookHandler } from './bookHandler.js'
import { schemas, validateBody, validateParams } from '@book-library-tool/api'

export default Router()
  .post('/', validateBody(schemas.BookSchema), bookHandler.createBook)
  .get(
    '/:referenceId',
    validateParams(schemas.BookIdSchema),
    bookHandler.getBook,
  )
  .delete(
    '/:referenceId',
    validateParams(schemas.BookIdSchema),
    bookHandler.deleteBook,
  )
