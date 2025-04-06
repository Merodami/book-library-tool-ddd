import { Router } from 'express'
import createBookRoutes from '@routes/books/bookRoute.js'
import { BookController } from '@controllers/bookController.js'

export default function (bookController: BookController) {
  const router = Router()

  router.use('/books', createBookRoutes(bookController))

  return router
}
