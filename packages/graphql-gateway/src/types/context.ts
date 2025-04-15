import { RedisService } from '@book-library-tool/redis'
import { Request } from 'express'

import { BookLoader } from '../loaders/BookLoader.js'
import { BooksService } from '../modules/books/index.js'
import { ReservationsService } from '../modules/reservations/service.js'

/**
 * Context for GraphQL resolvers
 */
export interface GraphQLContext {
  req: Request
  booksService: BooksService
  reservationsService: ReservationsService
  bookLoader: BookLoader
  redisService: RedisService
}
