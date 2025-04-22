import { schemas } from '@book-library-tool/api'
import { BaseProjectionRepository } from '@book-library-tool/database'
import { PaginatedResult, RESERVATION_STATUS } from '@book-library-tool/types'
import { DomainReservation } from '@reservations/entities/DomainReservation.js'
import type { ReservationDocument } from '@reservations/persistence/mongo/documents/ReservationDocument.js'
import type { IReservationReadProjectionRepository } from '@reservations/repositories/IReservationReadProjectionRepository.js'
import { Collection, Filter } from 'mongodb'

/**
 * MongoDB-based Reservation projection repository.
 * Leverages BaseProjectionRepository for standard reads,
 * and provides versioned or generic update methods.
 */
export class ReservationReadProjectionRepository
  extends BaseProjectionRepository<ReservationDocument, DomainReservation>
  implements IReservationReadProjectionRepository
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
    // Build filter from search criteria
    const filter: Filter<ReservationDocument> = { userId }

    // Count total before pagination
    const total = await this.count(filter)

    // Prepare pagination values
    const skip = query.skip || 0
    const limit = query.limit || 10
    const page = Math.floor(skip / limit) + 1
    const pages = Math.ceil(total / limit)

    // Use base class to perform the query
    const data = await this.findMany(filter, {
      skip,
      limit,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      fields,
    })

    // Return data with pagination metadata
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages,
        hasNext: skip + limit < total,
        hasPrev: skip > 0,
      },
    }
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
   * @returns Boolean indicating whether any reservation exists
   */
  async hasActiveReservations(bookId: string): Promise<boolean> {
    // Build filter for active reservations
    const filter: Filter<ReservationDocument> = {
      bookId,
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

/**
 * Transform a MongoDB document into a Reservation.
 * Serializes dates to ISO strings.
 */
function mapToDomain(doc: Partial<ReservationDocument>): DomainReservation {
  if (
    !doc.id ||
    !doc.userId ||
    !doc.bookId ||
    !doc.reservedAt ||
    !doc.dueDate ||
    !doc.createdAt ||
    doc.version === undefined
  ) {
    throw new Error('Invalid ReservationDocument for mapping to domain')
  }

  return {
    id: doc.id,
    userId: doc.userId,
    bookId: doc.bookId,
    status: doc.status as RESERVATION_STATUS,
    feeCharged: doc.feeCharged!,
    retailPrice: doc.retailPrice!,
    reservedAt: doc.reservedAt,
    dueDate: doc.dueDate,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt ?? undefined,
    deletedAt: doc.deletedAt ?? undefined,
    version: doc.version!,
    lateFee: doc.lateFee!,
    statusReason: doc.statusReason,
    payment: doc.payment
      ? {
          date: doc.payment.date,
          amount: doc.payment.amount,
          method: doc.payment.method,
          reference: doc.payment.reference,
          failReason: doc.payment.failReason,
          received: doc.payment.received,
        }
      : undefined,
  }
}
