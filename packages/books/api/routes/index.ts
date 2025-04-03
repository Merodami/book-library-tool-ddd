import { Router } from 'express'
import bookRoute from './book/index.js'

export default Router().use('/books', bookRoute)
