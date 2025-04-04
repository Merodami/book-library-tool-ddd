import { Router } from 'express'
import createBookRoutes from './book/index.js'
import { BookController } from '../controllers/bookController.js'

export default function (bookController: BookController) {
  const router = Router()

  router.use('/books', createBookRoutes(bookController))

  return router
}
