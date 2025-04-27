import { schemas } from '@book-library-tool/api'
import {
  buildRangeFilter,
  buildTextFilter,
  MongoReadProjectionRepository,
} from '@book-library-tool/database'
import { PaginatedResult, RESERVATION_STATUS } from '@book-library-tool/types'
import { DomainReservation } from '@reservations/domain/entities/DomainReservation.js'
import type { ReservationDocument } from '@reservations/infrastructure/persistence/mongo/documents/ReservationDocument.js'
import { mapToDomain } from '@reservations/infrastructure/persistence/mongo/mappers/ReservationDocCodec.js'
import { Collection, Filter } from 'mongodb'
import { ReservationReadProjectionRepositoryPort } from 'src/domain/port/index.js'

/**
 * MongoDB-based Reservation projection repository.
 * Leverages BaseProjectionRepository for standard reads,
 * and provides versioned or generic update methods.
 */
export class ReservationReadProjectionRepository
  extends MongoReadProjectionRepository<ReservationDocument, DomainReservation>
  implements ReservationReadProjectionRepositoryPort
{
  constructor(collection: Collection<ReservationDocument>) {
    super(collection, mapToDomain)
  }

  /**
   * Get a user's reservations in pages (newest first).
   * @param query - Search and pagination parameters
   * @param fields - Optional fields to include in results
   * @returns Paginated response containing domain Reservation objects
   */
  async getUserReservations(
    userId: string,
    query: schemas.ReservationsHistoryQuery,
    fields?: schemas.ReservationSortField[],
  ): Promise<PaginatedResult<DomainReservation>> {
    const filter: Filter<ReservationDocument> = { userId }

    // Text-based filters on title, author, publisher
    Object.assign(
      filter,
      buildTextFilter('bookId', query.bookId),
      buildTextFilter('status', query.status),
      buildTextFilter('statusReason', query.statusReason),
      buildTextFilter('paymentMethod', query.paymentMethod),
      buildTextFilter('paymentReference', query.paymentReference),
      buildTextFilter('paymentFailReason', query.paymentFailReason),
    )

    // Numeric range filters for publicationYear and price
    Object.assign(
      filter,
      buildRangeFilter('feeCharged', {
        exact: query.feeCharged,
        min: query.feeChargedMin,
        max: query.feeChargedMax,
      }),
      buildRangeFilter('retailPrice', {
        exact: query.retailPrice,
        min: query.retailPriceMin,
        max: query.retailPriceMax,
      }),
      buildRangeFilter('lateFee', {
        exact: query.lateFee,
        min: query.lateFeeMin,
        max: query.lateFeeMax,
      }),
    )

    return this.executePaginatedQuery(filter, query, fields)
  }

  /**
   * Find a reservation by ID, excluding soft-deleted.
   * @param id - Unique reservation identifier
   * @param fields - Optional fields to include in results
   * @returns Domain Reservation object or null if not found
   */
  async getReservationById(
    id: string,
    fields?: schemas.ReservationSortField[],
  ): Promise<DomainReservation | null> {
    return this.findOne(
      { id } as Filter<ReservationDocument>,
      fields,
      `Reservation ${id}`,
    )
  }

  /**
   * List all active reservations for a book.
   * @param bookId - Book ID
   * @param fields - Optional fields to include in results
   * @returns Array of domain Reservation objects
   */
  async getActiveBookReservations(
    bookId: string,
    fields?: schemas.ReservationSortField[],
  ): Promise<DomainReservation[]> {
    return this.findMany(
      {
        bookId,
        status: {
          $in: [RESERVATION_STATUS.RESERVED, RESERVATION_STATUS.BORROWED],
        },
      },
      {
        skip: 0,
        limit: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        fields,
      },
    )
  }

  /**
   * Checks if any active reservation exists for a specific book
   * @param bookId - Book ID
   * @param userId - User identifier
   * @returns Boolean indicating whether any reservation exists
   */
  async hasActiveReservations(
    bookId: string,
    userId: string,
  ): Promise<boolean> {
    // Build filter for active reservations
    const filter: Filter<ReservationDocument> = {
      bookId,
      userId,
      status: {
        $in: [RESERVATION_STATUS.RESERVED, RESERVATION_STATUS.BORROWED],
      },
    }

    // Count to check if any exist (more efficient than fetching data)
    const count = await this.count(filter)

    // Return true if at least one reservation exists
    return count > 0
  }

  /**
   * Count active (non-deleted) reservations for a user.
   * @param userId - User identifier
   * @returns Count of active reservations
   */
  async countActiveReservationsByUser(userId: string): Promise<number> {
    return this.count({
      userId,
      status: {
        $in: [
          RESERVATION_STATUS.RESERVED,
          RESERVATION_STATUS.BORROWED,
          RESERVATION_STATUS.PENDING_PAYMENT,
        ],
      },
    })
  }
}
