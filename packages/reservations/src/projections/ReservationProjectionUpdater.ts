// packages/reservation/src/projections/ReservationProjectionUpdater.ts

import { Collection } from 'mongodb'
import type { MongoDatabaseService } from '@book-library-tool/database'
import {
  type DomainEvent,
  RESERVATION_CREATED,
  RESERVATION_RETURNED,
} from '@book-library-tool/event-store'

export class ReservationProjectionUpdater {
  private readonly collection: Collection

  constructor(dbService: MongoDatabaseService) {
    // Use a dedicated collection for projection/read model data.
    this.collection = dbService.getCollection('reservations_read')
  }

  async handleEvent(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case RESERVATION_CREATED:
        // Insert new document into projection.
        await this.collection.insertOne({
          reservationId: event.payload.reservationId,
          userId: event.payload.userId,
          isbn: event.payload.isbn,
          reservedAt: event.payload.reservedAt,
          dueDate: event.payload.dueDate,
          status: event.payload.status,
          feeCharged: event.payload.feeCharged,
          createdAt: event.payload.createdAt,
          updatedAt: event.payload.updatedAt,
        })
        break
      case RESERVATION_RETURNED:
        // Update the document status and updatedAt.
        await this.collection.updateOne(
          { reservationId: event.payload.reservationId },
          {
            $set: {
              status: event.payload.updatedStatus,
              updatedAt: event.timestamp,
              // Optionally, store additional computed data: lateFeeApplied, daysLate, etc.
            },
          },
        )
        break
      // Handle additional events as needed
      default:
        console.warn(
          `Projection updater: Unhandled event type ${event.eventType}`,
        )
    }
  }
}
