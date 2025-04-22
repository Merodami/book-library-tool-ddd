import { schemas } from '@book-library-tool/api'
import {
  BaseProjectionRepository,
  convertDateStrings,
} from '@book-library-tool/database'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { DomainReservation } from '@reservations/entities/DomainReservation.js'
import type { ReservationDocument } from '@reservations/persistence/mongo/documents/ReservationDocument.js'
import type { IReservationWriteProjectionRepository } from '@reservations/repositories/IReservationWriteProjectionRepository.js'
import { Collection, Filter } from 'mongodb'

/**
 * MongoDB-based Reservation projection repository.
 * Leverages BaseProjectionRepository for standard reads,
 * and provides versioned or generic update methods.
 */
export class ReservationWriteProjectionRepository
  extends BaseProjectionRepository<ReservationDocument, DomainReservation>
  implements IReservationWriteProjectionRepository
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
    // Directly attempt the update with version check in a single operation
    const result = await this.collection.updateOne(
      {
        id,
        $or: [{ version: { $lt: version } }, { version: { $exists: false } }],
      },
      { $set: { ...updates, version } },
    )

    if (result.matchedCount === 0) {
      // Now we need to determine why it failed
      const document = await this.collection.findOne({ id })

      if (!document) {
        throw new Errors.ApplicationError(
          404,
          ErrorCode.RESERVATION_NOT_FOUND,
          `Reservation "${id}" not found`,
        )
      } else {
        throw new Errors.ApplicationError(
          409,
          ErrorCode.CONCURRENCY_CONFLICT,
          `Version conflict for reservation "${id}": current=${document.version}, new=${version}`,
        )
      }
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
   * Generic method to update reservation with version control
   */
  async updateReservationWithVersion(
    id: string,
    updates: Partial<DomainReservation>,
    version: number,
    eventType: string,
  ): Promise<void> {
    await this.applyVersionedUpdate(id, updates as any, version)

    logger.debug(`Applied ${eventType} update to reservation ${id}`)
  }

  /**
   * Insert a new reservation with a generated _id.
   * @param res - Reservation DTO to save
   */
  async saveReservationProjection(res: DomainReservation): Promise<void> {
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
        DomainReservation,
        'status' | 'feeCharged' | 'retailPrice' | 'reservedAt' | 'dueDate'
      >
    >,
    updatedAt: Date | string,
  ): Promise<void> {
    const allowedFields = [...schemas.ALLOWED_RESERVATION_FIELDS] as Array<
      keyof DomainReservation
    >

    await super.updateProjection(
      id,
      changes as Partial<DomainReservation>,
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
    await this.updateReservationWithVersion(
      id,
      { updatedAt: timestamp.toISOString() } as any,
      version,
      'BOOK_BROUGHT',
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
    updates: Partial<DomainReservation>,
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
    updates: Partial<DomainReservation>,
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
          $in: [
            RESERVATION_STATUS.RESERVED,
            RESERVATION_STATUS.BORROWED,
            RESERVATION_STATUS.LATE,
          ],
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
    lateFee: doc.lateFee!,
    reservedAt: doc.reservedAt,
    dueDate: doc.dueDate,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt ?? undefined,
    deletedAt: doc.deletedAt ?? undefined,
    version: doc.version!,
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
/**
 * Transform a Reservation into a MongoDB document.
 * Converts ISO strings back to Date.
 */
function mapToDocument(
  res: DomainReservation,
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
    version: res.version,
    feeCharged: res.feeCharged,
    retailPrice: res.retailPrice,
    lateFee: res.lateFee,
    createdAt: dates.createdAt ?? new Date(),
    reservedAt: dates.reservedAt!,
    dueDate: dates.dueDate!,
    updatedAt: dates.updatedAt,
    deletedAt: dates.deletedAt,
  } as ReservationDocument & { version: number }
}
