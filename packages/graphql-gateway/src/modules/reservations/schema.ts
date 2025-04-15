import { gql } from 'graphql-tag'

export const typeDefs = gql`
  """
  A book reservation in the library
  """
  type Reservation {
    """
    The unique identifier of the reservation
    """
    id: ID!

    """
    The book being reserved
    """
    book: Book!

    """
    The user who made the reservation
    """
    userId: String!

    """
    The date when the reservation was made
    """
    reservationDate: String!

    """
    The status of the reservation
    """
    status: ReservationStatus!
  }

  """
  Possible reservation statuses
  """
  enum ReservationStatus {
    """
    Reservation is active
    """
    ACTIVE

    """
    Reservation has been completed
    """
    COMPLETED
  }

  type Query {
    """
    Get all reservations
    """
    reservations: [Reservation!]!

    """
    Get a reservation by its ID
    """
    reservation(id: String!): Reservation
  }

  type Mutation {
    """
    Create a new reservation
    """
    createReservation(bookId: String!, userId: String!): Reservation!
  }
`
