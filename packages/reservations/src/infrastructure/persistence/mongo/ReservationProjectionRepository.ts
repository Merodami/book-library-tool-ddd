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

/**
 * Maps database document to the Reservation entity.
 * Ensures that the data structure from the database matches the expected external data model.
 *
 * @param doc The database document
 * @returns A properly formatted Reservation object
 */
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

/**
 * Repository implementation for reservation projections.
 * Handles read-only operations against the reservation projection model.
 * Part of the CQRS pattern where this represents the Query side.
 */
export class ReservationProjectionRepository
  implements IReservationProjectionRepository
{
  private readonly collection: Collection<Reservation>

  /**
   * Creates a new instance of ReservationProjectionRepository.
   *
   * @param dbService MongoDB database service
   */
  constructor(private dbService: MongoDatabaseService) {
    this.collection = dbService.getCollection('reservation_projection')
  }

  /**
   * Retrieves all reservations for a specific user with pagination.
   *
   * @param userId The user identifier
   * @param pagination Page number and limit options
   * @returns Paginated list of the user's reservations
   */
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

  /**
   * Retrieves a specific reservation by its ID.
   *
   * @param reservationId The reservation identifier
   * @returns The reservation if found, null otherwise
   */
  async getReservationById(reservationId: string): Promise<Reservation | null> {
    const doc = await this.collection.findOne({ id: reservationId })

    return doc ? mapProjectionToReservation(doc) : null
  }

  /**
   * Retrieves reservations for a specific book with optional filtering.
   *
   * @param isbn The book's ISBN
   * @param userId Optional filter by user ID
   * @param status Optional filter by reservation status
   * @param pagination Page number and limit options
   * @returns Paginated list of reservations for the book
   */
  async getBookReservations(
    isbn: string,
    userId?: string,
    status?: RESERVATION_STATUS,
    pagination: PaginatedQuery = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Reservation>> {
    const { page = 1, limit = 10 } = pagination

    // Build the filter based on provided parameters
    const filter: Record<string, unknown> = {
      isbn,
      deletedAt: { $exists: false }, // Add this to exclude deleted reservations
    }

    // Add optional filters
    if (status) {
      filter.status = status
    } else {
      // If no status is provided, only show active reservations by default
      filter.status = {
        $in: [
          RESERVATION_STATUS.RESERVED,
          RESERVATION_STATUS.CONFIRMED,
          RESERVATION_STATUS.BORROWED,
        ],
      }
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

  /**
   * Retrieves all active reservations for a specific book.
   * Used to check book availability and manage inventory.
   *
   * @param isbn The book's ISBN
   * @returns List of active reservations for the book
   */
  async getActiveBookReservations(isbn: string): Promise<Reservation[]> {
    const activeReservations = await this.collection
      .find({
        isbn,
        status: {
          $in: [RESERVATION_STATUS.RESERVED, RESERVATION_STATUS.CONFIRMED],
        },
        deletedAt: { $exists: false },
      })
      .project({ _id: 0 })
      .toArray()

    return activeReservations.map(mapProjectionToReservation)
  }

  /**
   * Retrieves reservations filtered by status with pagination.
   * Useful for administrative dashboards and reporting.
   *
   * @param status The reservation status to filter by
   * @param pagination Page number and limit options
   * @returns Paginated list of reservations with the specified status
   */
  async getReservationsByStatus(
    status: RESERVATION_STATUS,
    pagination: PaginatedQuery = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Reservation>> {
    const { page = 1, limit = 10 } = pagination

    const paginatedReservations = await getPaginatedData<Reservation>(
      this.dbService,
      this.collection,
      { status, deletedAt: { $exists: false } },
      { limit, page },
      { projection: { _id: 0 }, sort: { createdAt: -1 } },
    )

    return {
      ...paginatedReservations,
      data: paginatedReservations.data.map(mapProjectionToReservation),
    }
  }

  /**
   * Counts the number of active reservations for a specific user.
   * Used to enforce business rules such as the maximum number of concurrent reservations.
   *
   * @param userId The user identifier
   * @returns The count of active reservations for the user
   */
  async countActiveReservationsByUser(userId: string): Promise<number> {
    const count = await this.collection.countDocuments({
      userId,
      status: {
        $in: [
          RESERVATION_STATUS.RESERVED,
          RESERVATION_STATUS.CONFIRMED,
          RESERVATION_STATUS.BORROWED,
          RESERVATION_STATUS.PENDING_PAYMENT,
        ],
      },
      deletedAt: { $exists: false },
    })

    return count
  }
}
