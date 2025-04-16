import {
  apiBooks,
  apiReservations,
  Reservation,
  ReservationRequest,
} from '@book-library-tool/sdk'

interface BookAvailability {
  isbn: string
  available: boolean
}

/**
 * Reservations service client
 */
export class ReservationsService {
  /**
   * Checks the availability status of multiple books by checking the catalog
   */
  async checkBooksAvailability(
    bookIsbn: string[],
  ): Promise<BookAvailability[]> {
    try {
      // Check each ISBN's availability using the catalog endpoint
      const availabilityPromises = bookIsbn.map(async (isbn) => {
        const response = await apiBooks.books.searchCatalog({
          isbn,
          // limit: 1,
        })
        return {
          isbn,
          available: response.data.length > 0,
        }
      })

      return Promise.all(availabilityPromises)
    } catch (error) {
      console.error('Error checking books availability:', error)
      // Default to available if we can't check
      return bookIsbn.map((isbn) => ({
        isbn,
        available: true,
      }))
    }
  }

  /**
   * Retrieves all reservations for a user
   */
  async getAllReservations(userId: string): Promise<Reservation[]> {
    const reservations = await apiReservations.reservations.getUserReservations(
      {
        userId,
      },
    )
    return reservations.data
  }

  /**
   * Retrieves a reservation by its ID
   */
  async getReservation(userId: string, id: string): Promise<Reservation> {
    const reservations = await apiReservations.reservations.getUserReservations(
      {
        userId,
      },
    )

    const reservation = reservations.data.find((r) => r.reservationId === id)

    if (!reservation) {
      throw new Error(`Reservation with ID ${id} not found`)
    }

    return reservation
  }

  /**
   * Creates a new reservation
   */
  async createReservation(
    reservation: ReservationRequest,
  ): Promise<Reservation> {
    const createdReservation =
      await apiReservations.reservations.createReservation({
        requestBody: reservation,
      })

    return createdReservation
  }
}
