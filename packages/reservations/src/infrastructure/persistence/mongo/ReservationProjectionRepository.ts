import { MongoDatabaseService } from '@book-library-tool/database'
import { Reservation } from '@book-library-tool/sdk'
import {
  PaginatedQuery,
  PaginatedResult,
  RESERVATION_STATUS,
} from '@book-library-tool/types'
import { IReservationProjectionRepository } from '@reservations/repositories/IReservationProjectionRepository.js'
import type { Collection } from 'mongodb'

const RESERVATION_PROJECTION_TABLE = 'reservation_projection'

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
 * MongoDB implementation of the reservation projection repository.
 * Handles both read operations for queries and update operations for event handling.
 */
export class ReservationProjectionRepository
  implements IReservationProjectionRepository
{
  private readonly collection: Collection<any>

  /**
   * Creates a new instance of MongoReservationProjectionRepository.
   *
   * @param dbService MongoDB database service
   */
  constructor(private dbService: MongoDatabaseService) {
    this.collection = dbService.getCollection(RESERVATION_PROJECTION_TABLE)
  }

  // Read methods from IReservationProjectionRepository

  /**
   * Retrieves all reservations for a specific user with pagination.
   */
  async getUserReservations(
    userId: string,
    pagination: PaginatedQuery = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Reservation>> {
    const { page = 1, limit = 10 } = pagination

    // Build the filter based on provided parameters
    const filter: Record<string, unknown> = { userId }

    // Use the pagination helper to get paginated reservation data
    const paginatedReservations =
      await this.dbService.paginateCollection<Reservation>(
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
   */
  async getReservationById(reservationId: string): Promise<Reservation | null> {
    const doc = await this.collection.findOne({ id: reservationId })

    return doc ? mapProjectionToReservation(doc) : null
  }

  /**
   * Retrieves reservations for a specific book with optional filtering.
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
          RESERVATION_STATUS.RESERVED,
          RESERVATION_STATUS.BORROWED,
        ],
      }
    }

    if (userId) {
      filter.userId = userId
    }

    // Use the pagination helper to get paginated reservation data
    const paginatedReservations =
      await this.dbService.paginateCollection<Reservation>(
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
   */
  async getActiveBookReservations(isbn: string): Promise<Reservation[]> {
    const activeReservations = await this.collection
      .find({
        isbn,
        status: {
          $in: [RESERVATION_STATUS.RESERVED, RESERVATION_STATUS.RESERVED],
        },
        deletedAt: { $exists: false },
      })
      .project({ _id: 0 })
      .toArray()

    return activeReservations.map(mapProjectionToReservation)
  }

  /**
   * Retrieves reservations filtered by status with pagination.
   */
  async getReservationsByStatus(
    status: RESERVATION_STATUS,
    pagination: PaginatedQuery = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Reservation>> {
    const { page = 1, limit = 10 } = pagination

    const paginatedReservations =
      await this.dbService.paginateCollection<Reservation>(
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
   */
  async countActiveReservationsByUser(userId: string): Promise<number> {
    const count = await this.collection.countDocuments({
      userId,
      status: {
        $in: [
          RESERVATION_STATUS.RESERVED,
          RESERVATION_STATUS.RESERVED,
          RESERVATION_STATUS.BORROWED,
          RESERVATION_STATUS.PENDING_PAYMENT,
        ],
      },
      deletedAt: { $exists: false },
    })

    return count
  }

  /**
   * Creates a new reservation projection.
   */
  async saveReservation(reservationData: any): Promise<void> {
    await this.collection.insertOne(reservationData)
  }

  /**
   * Common method for version-aware updates to prevent duplication.
   * Used by multiple event handlers that need similar update logic.
   */
  private async updateReservationWithVersion(
    id: string,
    updates: any,
    version: number,
  ): Promise<void> {
    await this.collection.updateOne(
      {
        id,
        version: { $lt: version },
      },
      {
        $set: updates,
      },
    )
  }

  /**
   * Updates a reservation when it's returned.
   */
  async updateReservationReturned(
    id: string,
    updates: any,
    version: number,
  ): Promise<void> {
    await this.updateReservationWithVersion(id, updates, version)
  }

  /**
   * Updates a reservation when it's cancelled.
   */
  async updateReservationCancelled(
    id: string,
    updates: any,
    version: number,
  ): Promise<void> {
    await this.updateReservationWithVersion(id, updates, version)
  }

  /**
   * Updates a reservation when it becomes overdue.
   */
  async updateReservationOverdue(
    id: string,
    updates: any,
    version: number,
  ): Promise<void> {
    await this.updateReservationWithVersion(id, updates, version)
  }

  /**
   * Marks a reservation as deleted.
   */
  async markReservationAsDeleted(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          version,
          deletedAt: new Date(),
          updatedAt: timestamp,
        },
      },
    )
  }

  /**
   * Updates all reservations for a book when book details change.
   */
  async updateReservationsForBookUpdate(
    isbn: string,
    timestamp: Date,
  ): Promise<void> {
    await this.collection.updateMany(
      { isbn, deletedAt: null },
      {
        $set: {
          updatedAt: timestamp,
        },
      },
    )
  }

  /**
   * Updates reservations when a book is deleted.
   */
  async markReservationsForDeletedBook(
    isbn: string,
    timestamp: Date,
  ): Promise<void> {
    await this.collection.updateMany(
      { isbn, status: 'active', deletedAt: null },
      {
        $set: {
          bookDeleted: true,
          updatedAt: timestamp,
        },
      },
    )
  }

  /**
   * Updates a reservation based on book validation results.
   */
  async updateReservationValidationResult(
    reservationId: string,
    updates: any,
  ): Promise<void> {
    await this.collection.updateOne({ id: reservationId }, { $set: updates })
  }

  /**
   * Updates a reservation after successful payment.
   */
  async updateReservationPaymentSuccess(
    id: string,
    updates: any,
    version: number,
  ): Promise<void> {
    await this.updateReservationWithVersion(id, updates, version)
  }

  /**
   * Updates a reservation after failed payment.
   */
  async updateReservationPaymentDeclined(
    id: string,
    updates: any,
  ): Promise<{ matchedCount: number }> {
    const result = await this.collection.updateOne({ id }, { $set: updates })

    return { matchedCount: result.matchedCount }
  }

  /**
   * Updates a reservation's retail price.
   */
  async updateReservationRetailPrice(
    id: string,
    retailPrice: number,
    timestamp: Date,
  ): Promise<void> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          retailPrice: Number(retailPrice),
          updatedAt: timestamp,
        },
      },
    )
  }

  /**
   * Updates a reservation when the book is brought back.
   */
  async updateReservationBookBrought(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          status: RESERVATION_STATUS.BROUGHT,
          updatedAt: timestamp,
          version,
        },
      },
    )
  }
}
