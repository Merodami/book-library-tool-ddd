import {
  getPaginatedData,
  MongoDatabaseService,
} from '@book-library-tool/database'
import { Reservation } from '@book-library-tool/sdk'
import {
  PaginatedQuery,
  PaginatedResult,
  RESERVATION_STATUS,
} from '@book-library-tool/types'
import { IReservationProjectionRepository } from '@repositories/IReservationProjectionRepository.js'
import type { Collection } from 'mongodb'

// A mapping function to ensure that domain model fields match those expected externally
function mapProjectionToReservation(doc: any): Reservation {
  return {
    reservationId: doc.id,
    userId: doc.userId,
    isbn: doc.isbn,
    status: doc.status,
    createdAt: doc.createdAt,
    feeCharged: doc.feeCharged,
    dueDate: doc.dueDate,
    reservedAt: doc.reservedAt,
    updatedAt: doc.updatedAt,
  }
}

export class ReservationProjectionRepository
  implements IReservationProjectionRepository
{
  private readonly collection: Collection<Reservation>

  constructor(private dbService: MongoDatabaseService) {
    this.collection = dbService.getCollection('reservation_projection')
  }

  async getUserReservations(
    userId: string,
    pagination: PaginatedQuery = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Reservation>> {
    const { page = 1, limit = 10 } = pagination

    // Build the filter based on provided parameters
    const filter: Record<string, unknown> = { userId }

    // Use the pagination helper to get paginated reservation data
    const paginatedReservations = await getPaginatedData<Reservation>(
      this.dbService,
      this.collection,
      filter,
      { limit, page },
      { projection: { _id: 0 }, sort: { createdAt: -1 } }, // Sort by creation date, most recent first
    )

    // Map the results to ensure they match the expected format
    return {
      ...paginatedReservations,
      data: paginatedReservations.data.map(mapProjectionToReservation),
    }
  }

  async getReservationById(reservationId: string): Promise<Reservation | null> {
    const doc = await this.collection.findOne({ id: reservationId })

    return doc ? mapProjectionToReservation(doc) : null
  }

  async getBookReservations(
    isbn: string,
    userId?: string,
    status?: RESERVATION_STATUS,
    pagination: PaginatedQuery = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Reservation>> {
    const { page = 1, limit = 10 } = pagination

    // Build the filter based on provided parameters
    const filter: Record<string, unknown> = { isbn }

    // Add optional filters
    if (status) {
      filter.status = status
    }

    if (userId) {
      filter.userId = userId
    }

    // Use the pagination helper to get paginated reservation data
    const paginatedReservations = await getPaginatedData<Reservation>(
      this.dbService,
      this.collection,
      filter,
      { limit: Math.floor(Number(limit)), page: Math.floor(Number(page)) },
      { projection: { _id: 0 }, sort: { createdAt: -1 } },
    )

    // Map the results to ensure they match the expected format
    return {
      ...paginatedReservations,
      data: paginatedReservations.data.map(mapProjectionToReservation),
    }
  }

  // Additional method to get current active reservations for a book
  // This could be useful for checking availability
  async getActiveBookReservations(isbn: string): Promise<Reservation[]> {
    const activeReservations = await this.collection
      .find({
        isbn,
        status: [RESERVATION_STATUS.RESERVED, RESERVATION_STATUS.CONFIRMED],
      })
      .project({ _id: 0 })
      .toArray()

    return activeReservations.map(mapProjectionToReservation)
  }

  // Additional method that could be useful for dashboard/analytics
  async getReservationsByStatus(
    status: RESERVATION_STATUS,
    pagination: PaginatedQuery = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Reservation>> {
    const { page = 1, limit = 10 } = pagination

    const paginatedReservations = await getPaginatedData<Reservation>(
      this.dbService,
      this.collection,
      { status },
      { limit, page },
      { projection: { _id: 0 }, sort: { createdAt: -1 } },
    )

    return {
      ...paginatedReservations,
      data: paginatedReservations.data.map(mapProjectionToReservation),
    }
  }
}
