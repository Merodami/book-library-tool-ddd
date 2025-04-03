import { Router } from 'express'
import bookRoute from './book/index.js'
import catalogRoute from './catalog/index.js'
import reservationRoute from './reservation/index.js'

export default Router()
  .use('/books', bookRoute)
  .use('/catalog', catalogRoute)
  .use('/reservations', reservationRoute)
