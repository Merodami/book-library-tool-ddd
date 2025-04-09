// packages/reservation/src/application/handlers/CreateReservationHandler.ts

import type { EventBus } from '@book-library-tool/event-store'
import { Reservation } from '@entities/Reservation.js'
import type { IReservationRepositoryEvent } from '@repositories/IReservationRepositoryEvent.js'
import { Errors } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'

/**
 * Command shape for creating a reservation.
 * (If you already have a generated SDK DTO you prefer, replace this interface.)
 */
export interface CreateReservationCommand {
  userId: string
  isbn: string
}

/**
 * Handles the CreateReservationCommand.
 * 1. Builds a Reservation aggregate via Reservation.create()
 * 2. Persists the resulting ReservationCreated event in the event store
 * 3. Publishes the event on the EventBus for downstream processing
 */
export class CreateReservationHandler {
  constructor(
    private readonly repository: IReservationRepositoryEvent,
    private readonly eventBus: EventBus,
  ) {}

  public async execute(command: CreateReservationCommand): Promise<string> {
    // ── 1. (Optional) Prevent duplicate active reservations ──────────────────────
    // If your domain rules forbid more than one ACTIVE reservation for the same
    // (userId, isbn) pair you can query a projection or event‑store here.
    const existing = await this.repository.findActiveByUserAndIsbn(
      command.userId,
      command.isbn,
    )

    if (existing) {
      throw new Errors.ApplicationError(
        400,
        'RESERVATION_ALREADY_EXISTS',
        `User ${command.userId} already has an active reservation for ISBN ${command.isbn}.`,
      )
    }

    // ── 2. Create the aggregate & initial event ─────────────────────────────────
    const { reservation, event } = Reservation.create({
      userId: command.userId.trim(),
      isbn: command.isbn.trim(),
      reservedAt: new Date().toISOString(),
      status: RESERVATION_STATUS.RESERVED,
    })

    // ── 3. Persist the event (expected version = 0 for a new aggregate) ─────────
    await this.repository.saveEvents(reservation.reservationId, [event], 0)

    // ── 4. Publish the event so saga/orchestrators can react asynchronously ─────
    await this.eventBus.publish(event)

    // Return the reservation’s aggregate‑id / UUID so the caller can reference it.
    return reservation.reservationId
  }
}
