import { Reservation } from '@book-library-tool/sdk'
import { Request } from 'express'

import { BooksService } from '../books/service.js'
import { ReservationsService } from './service.js'

/**
 * Context for GraphQL resolvers
 */
export interface GraphQLContext {
  req: Request
  booksService: BooksService
  reservationsService: ReservationsService
}

/**
 * Creates reservations resolvers
 */
export const createResolvers = () => ({
  Query: {
    reservations: async (
      _: unknown,
      { userId }: { userId: string },
      { reservationsService }: GraphQLContext,
    ): Promise<Reservation[]> => {
      return reservationsService.getAllReservations(userId)
    },
    reservation: async (
      _: unknown,
      { userId, id }: { userId: string; id: string },
      { reservationsService }: GraphQLContext,
    ): Promise<Reservation> => {
      return reservationsService.getReservation(userId, id)
    },
  },
  Mutation: {
    createReservation: async (
      _: unknown,
      { bookId, userId }: { bookId: string; userId: string },
      { reservationsService }: GraphQLContext,
    ): Promise<Reservation> => {
      return reservationsService.createReservation({ userId, isbn: bookId })
    },
  },
  Reservation: {
    book: async (
      reservation: Reservation,
      _: unknown,
      { booksService }: GraphQLContext,
    ) => {
      return booksService.getBook(reservation.isbn)
    },
  },
})
