import { schemas } from '@book-library-tool/api'
import {
  BaseProjectionRepository,
  convertDateStrings,
} from '@book-library-tool/database'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import type { IReservationProjectionRepository } from '@reservations/repositories/IReservationProjectionRepository.js'
import { Collection, Filter } from 'mongodb'

import type { ReservationDocument } from './documents/ReservationDocument.js'

/**
 * MongoDB-based Reservation projection repository.
 * Leverages BaseProjectionRepository for standard reads,
 * and provides versioned or generic update methods.
 */
export class ReservationProjectionRepository
  extends BaseProjectionRepository<ReservationDocument, schemas.Reservation>
  implements IReservationProjectionRepository
{
  constructor(collection: Collection<ReservationDocument>) {
    super(collection, mapToDomain)
  }

  /**
   * Apply a version-aware update, ensuring out-of-order events are ignored.
   */
  private async applyVersionedUpdate(
    id: string,
    updates: Partial<ReservationDocument>,
    version: number,
  ): Promise<void> {
    const result = await this.collection.updateOne(
      { id, version: { $lt: version } },
      { $set: { ...updates, version } },
    )

    if (result.matchedCount === 0) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.RESERVATION_NOT_FOUND,
        `Reservation "${id}" not found or version conflict`,
      )
    }
  }

  /**
   * Apply a simple update; optionally throw or log if no doc matched.
   */
  private async applySimpleUpdate(
    id: string,
    updates: Partial<ReservationDocument>,
    options?: { throwIfNotFound?: boolean; warnMessage?: string },
  ): Promise<number> {
    const result = await this.collection.updateOne({ id }, { $set: updates })

    if (result.matchedCount === 0) {
      if (options?.throwIfNotFound) {
        throw new Errors.ApplicationError(
          404,
          ErrorCode.RESERVATION_NOT_FOUND,
          `Reservation "${id}" not found.`,
        )
      }
      if (options?.warnMessage) {
        logger.warn(options.warnMessage)
      }
    }

    return result.matchedCount
  }

  /**
   * Get a user's reservations in pages (newest first).
   * @param query - Search and pagination parameters
   * @param fields - Optional fields to include in results
   * @returns Paginated response containing domain Reservation objects
   */
  async getUserReservations(
    query: schemas.ReservationsHistoryQuery,
    fields?: schemas.ReservationSortField[],
  ): Promise<schemas.PaginatedResult<schemas.Reservation>> {
    // Build filter from search criteria
    const filter: Filter<ReservationDocument> = { userId: query.userId }

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
  ): Promise<schemas.Reservation | null> {
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
  ): Promise<schemas.Reservation[]> {
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
   * Get reservations by status in pages.
   * @param status - Reservation status to filter by
   * @param fields - Optional fields to include in results
   * @returns Paginated response containing domain Reservation objects
   */
  async getReservationsByStatus(
    status: RESERVATION_STATUS,
    fields?: schemas.ReservationSortField[],
  ): Promise<schemas.PaginatedResult<schemas.Reservation>> {
    // Build filter from status
    const filter: Filter<ReservationDocument> = { status }

    // Count total before pagination
    const total = await this.count(filter)

    // Prepare pagination values
    const skip = 0
    const limit = 10
    const page = 1
    const pages = Math.ceil(total / limit)

    // Use base class to perform the query
    const data = await this.findMany(filter, {
      skip,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
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
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Count active (non-deleted) reservations for a user.
   * @param userId - User identifier
   * @param fields - Optional fields (unused in count operation but included for interface compatibility)
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
          RESERVATION_STATUS.BORROWED,
        ],
      },
    })
  }

  /**
   * Insert a new reservation with a generated _id.
   * @param res - Reservation DTO to save
   */
  async saveReservationProjection(res: schemas.Reservation): Promise<void> {
    await this.saveProjection(res, mapToDocument)
  }

  /**
   * Partially update allowed fields on a reservation.
   * @param id - Reservation identifier
   * @param changes - Fields to update
   * @param updatedAt - Update timestamp
   */
  async updateReservationProjection(
    id: string,
    changes: Partial<
      Pick<
        schemas.Reservation,
        'status' | 'feeCharged' | 'retailPrice' | 'reservedAt' | 'dueDate'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void> {
    const allowedFields = [...schemas.ALLOWED_RESERVATION_FIELDS] as Array<
      keyof schemas.Reservation
    >

    await super.updateProjection(
      id,
      changes as Partial<schemas.Reservation>,
      allowedFields,
      updatedAt,
      ErrorCode.RESERVATION_NOT_FOUND,
      `Reservation with id "${id}" not found or deleted`,
    )
  }

  /**
   * Soft-delete a reservation for audit.
   * @param id - Reservation identifier
   * @param version - New version number
   * @param timestamp - Deletion timestamp
   */
  async markReservationAsDeleted(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void> {
    const result = await this.collection.updateOne(
      this.buildCompleteFilter({ id } as Filter<ReservationDocument>),
      { $set: { deletedAt: timestamp, updatedAt: timestamp, version } },
    )

    if (!result.matchedCount) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.RESERVATION_NOT_FOUND,
        `Reservation with id "${id}" not found or deleted`,
      )
    }
  }

  // ─── Event-driven Updates ─────────────────────────────────────────────────

  /**
   * Updates a reservation when it's returned.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   * @param version - New version number
   */
  async updateReservationReturned(
    id: string,
    updates: Partial<schemas.Reservation>,
    version: number,
  ): Promise<void> {
    await this.applyVersionedUpdate(id, updates as any, version)
  }

  /**
   * Updates a reservation when it's cancelled.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   * @param version - New version number
   */
  async updateReservationCancelled(
    id: string,
    updates: Partial<schemas.Reservation>,
    version: number,
  ): Promise<void> {
    await this.applyVersionedUpdate(id, updates as any, version)
  }

  /**
   * Updates a reservation when it becomes overdue.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   * @param version - New version number
   */
  async updateReservationOverdue(
    id: string,
    updates: Partial<schemas.Reservation>,
    version: number,
  ): Promise<void> {
    await this.applyVersionedUpdate(id, updates as any, version)
  }

  /**
   * Updates a reservation after successful payment.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   * @param version - New version number
   */
  async updateReservationPaymentSuccess(
    id: string,
    updates: Partial<schemas.Reservation>,
    version: number,
  ): Promise<void> {
    await this.applyVersionedUpdate(id, updates as any, version)
  }

  /**
   * Updates a reservation when the book is brought back.
   * @param id - Reservation identifier
   * @param version - New version number
   * @param timestamp - Update timestamp
   */
  async updateReservationBookBrought(
    id: string,
    version: number,
    timestamp: Date,
  ): Promise<void> {
    await this.applyVersionedUpdate(
      id,
      { updatedAt: timestamp } as any,
      version,
    )
    logger.info(`Reservation ${id} marked as brought`)
  }

  /**
   * Updates a reservation after failed payment.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   * @returns Object containing the matched count
   */
  async updateReservationPaymentDeclined(
    id: string,
    updates: Partial<schemas.Reservation>,
  ): Promise<{ matchedCount: number }> {
    return {
      matchedCount: await this.applySimpleUpdate(id, updates as any, {
        warnMessage: `No reservation "${id}" for payment decline update`,
      }),
    }
  }

  /**
   * Updates a reservation based on book validation results.
   * @param id - Reservation identifier
   * @param updates - Changes to apply
   */
  async updateReservationValidationResult(
    id: string,
    updates: Partial<schemas.Reservation>,
  ): Promise<void> {
    await this.applySimpleUpdate(id, updates as any, {
      warnMessage: `No reservation "${id}" for validation result`,
    })
  }

  /**
   * Updates a reservation's retail price.
   * @param id - Reservation identifier
   * @param retailPrice - New retail price
   * @param timestamp - Update timestamp
   */
  async updateReservationRetailPrice(
    id: string,
    retailPrice: number,
    timestamp: Date,
  ): Promise<void> {
    await this.applySimpleUpdate(
      id,
      { retailPrice, updatedAt: timestamp },
      {
        warnMessage: `No reservation "${id}" for retail price update`,
      },
    )
  }

  /**
   * Updates all reservations for a book when book details change.
   * @param bookId - Book ID
   * @param timestamp - Update timestamp
   */
  async updateReservationsForBookUpdate(
    bookId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.collection.updateMany(
      { bookId, deletedAt: { $exists: false } },
      { $set: { updatedAt: timestamp } },
    )
  }

  /**
   * Updates reservations when a book is deleted.
   * @param bookId - Book ID
   * @param timestamp - Update timestamp
   */
  async markReservationsForDeletedBook(
    bookId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.collection.updateMany(
      {
        bookId,
        status: {
          $in: [RESERVATION_STATUS.RESERVED, RESERVATION_STATUS.BORROWED],
        },
        deletedAt: { $exists: false },
      },
      { $set: { bookDeleted: true, updatedAt: timestamp } },
    )
  }
}

/**
 * Transform a MongoDB document into a Reservation.
 * Serializes dates to ISO strings.
 */
function mapToDomain(doc: Partial<ReservationDocument>): schemas.Reservation {
  const result: schemas.Reservation = {}

  // Map fields only if they exist in the document
  if ('id' in doc) result.id = doc.id
  if ('userId' in doc) result.userId = doc.userId
  if ('bookId' in doc) result.bookId = doc.bookId
  if ('status' in doc) result.status = doc.status as RESERVATION_STATUS
  if ('createdAt' in doc) result.createdAt = doc.createdAt?.toISOString()
  if ('reservedAt' in doc) result.reservedAt = doc.reservedAt?.toISOString()
  if ('dueDate' in doc) result.dueDate = doc.dueDate?.toISOString()
  if ('feeCharged' in doc) result.feeCharged = doc.feeCharged
  if ('retailPrice' in doc) result.retailPrice = doc.retailPrice
  if ('updatedAt' in doc) result.updatedAt = doc.updatedAt?.toISOString()
  if ('deletedAt' in doc) result.deletedAt = doc.deletedAt?.toISOString()

  return result
}

/**
 * Transform a Reservation into a MongoDB document.
 * Converts ISO strings back to Date.
 */
function mapToDocument(
  res: schemas.Reservation,
): Omit<ReservationDocument, '_id'> {
  if (!res.id || !res.userId || !res.bookId || !res.status) {
    throw new Errors.ApplicationError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Missing required id, userId, or bookId',
    )
  }

  const dates = convertDateStrings({
    createdAt: res.createdAt,
    reservedAt: res.reservedAt,
    dueDate: res.dueDate,
    updatedAt: res.updatedAt,
    deletedAt: res.deletedAt,
  } as Record<string, unknown>) as Record<string, Date | undefined>

  return {
    id: res.id,
    userId: res.userId,
    bookId: res.bookId,
    status: res.status,
    createdAt: dates.createdAt ?? new Date(),
    reservedAt: dates.reservedAt!,
    dueDate: dates.dueDate!,
    feeCharged: res.feeCharged ?? 0,
    retailPrice: res.retailPrice ?? 0,
    updatedAt: dates.updatedAt,
    deletedAt: dates.deletedAt,
  }
}
