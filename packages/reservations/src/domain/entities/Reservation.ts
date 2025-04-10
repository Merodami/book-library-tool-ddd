import { makeValidator, schemas } from '@book-library-tool/api'
import { AggregateRoot, DomainEvent } from '@book-library-tool/event-store'
import { Errors } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { randomUUID } from 'crypto'

const assertReservationSchema = makeValidator(schemas.ReservationSchema)

// Reservation domain event type constants
export const RESERVATION_CREATED = 'ReservationCreated'
export const RESERVATION_RETURNED = 'ReservationReturned'

export interface ReservationProps {
  userId: string
  isbn: string
  reservedAt: Date
  dueDate: Date
  status: RESERVATION_STATUS
  feeCharged: number
}

/**
 * The Reservation aggregate now extends AggregateRoot, inheriting a surrogate ID,
 * version tracking, and domain event management. It implements applyEvent() to update
 * mutable state from domain events.
 */
export class Reservation extends AggregateRoot {
  public readonly reservationId: string // Alias for this.id from AggregateRoot
  public readonly userId: string
  public readonly isbn: string
  public reservedAt: Date
  public dueDate: Date
  public status: RESERVATION_STATUS
  public feeCharged: number
  public createdAt: Date
  public updatedAt: Date
  public deletedAt?: Date

  /**
   * Private constructor enforces creation via factory methods.
   */
  private constructor(
    id: string | undefined,
    props: ReservationProps,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date,
  ) {
    super(id)
    // Use the AggregateRoot's id as the reservation identifier.
    this.reservationId = this.id
    this.userId = props.userId
    this.isbn = props.isbn
    this.reservedAt = props.reservedAt
    this.dueDate = props.dueDate
    this.status = props.status
    this.feeCharged = props.feeCharged
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.deletedAt = deletedAt
  }

  /**
   * Factory method for creating a new Reservation aggregate.
   * Validates input using the schema, calculates dueDate and feeCharged,
   * and produces a ReservationCreated event.
   */
  public static create(
    props: Partial<schemas.ReservationDTO> &
      Pick<schemas.ReservationDTO, 'userId' | 'isbn' | 'reservedAt' | 'status'>,
  ): { reservation: Reservation; event: DomainEvent } {
    const now = new Date()
    const dueDate = props.dueDate
      ? new Date(props.dueDate)
      : new Date(
          now.getTime() +
            (Number(process.env.BOOK_RETURN_DUE_DATE_DAYS) || 5) *
              24 *
              60 *
              60 *
              1000,
        )
    const feeCharged = props.feeCharged
      ? Number(props.feeCharged)
      : Number(process.env.BOOK_RESERVATION_FEE) || 3

    // Generate a temporary reservationId for validation; AggregateRoot will generate the actual one.
    const reservationId = props.reservationId || randomUUID()

    assertReservationSchema({
      ...props,
      reservationId,
      dueDate: dueDate.toISOString(),
      feeCharged,
    })

    const reservationProps: ReservationProps = {
      userId: props.userId.trim(),
      isbn: props.isbn.trim(),
      reservedAt: props.reservedAt ? new Date(props.reservedAt) : now,
      dueDate,
      status: props.status as RESERVATION_STATUS,
      feeCharged,
    }

    // Pass undefined to let AggregateRoot generate the true UUID.
    const reservation = new Reservation(undefined, reservationProps, now, now)
    const event: DomainEvent = {
      aggregateId: reservation.id,
      eventType: RESERVATION_CREATED,
      payload: {
        ...reservationProps,
        reservationId: reservation.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      timestamp: now,
      version: 1,
      schemaVersion: 1,
    }

    reservation.addDomainEvent(event)

    return { reservation, event }
  }

  /**
   * Domain method to mark the reservation as returned.
   * Instead of directly mutating state, it produces a ReservationReturned event.
   */
  public markAsReturned(): { reservation: Reservation; event: DomainEvent } {
    if (
      this.status !== RESERVATION_STATUS.RESERVED &&
      this.status !== RESERVATION_STATUS.BORROWED &&
      this.status !== RESERVATION_STATUS.LATE
    ) {
      throw new Errors.ApplicationError(
        400,
        'RESERVATION_CANNOT_BE_RETURNED',
        `Reservation with id ${this.reservationId} cannot be returned in its current status.`,
      )
    }
    const now = new Date()
    const newVersion = this.version + 1
    const updatedProps: ReservationProps = {
      userId: this.userId,
      isbn: this.isbn,
      reservedAt: this.reservedAt,
      dueDate: this.dueDate,
      status: RESERVATION_STATUS.RETURNED,
      feeCharged: this.feeCharged,
    }

    const updatedReservation = new Reservation(
      this.id,
      updatedProps,
      this.createdAt,
      now,
      this.deletedAt,
    )
    const event: DomainEvent = {
      aggregateId: this.id,
      eventType: RESERVATION_RETURNED,
      payload: {
        reservationId: this.reservationId,
        previousStatus: this.status,
        updatedStatus: RESERVATION_STATUS.RETURNED,
        returnedAt: now.toISOString(),
      },
      timestamp: now,
      version: newVersion,
      schemaVersion: 1,
    }

    updatedReservation.addDomainEvent(event)

    return { reservation: updatedReservation, event }
  }

  /**
   * Rehydrates a Reservation aggregate from an array of DomainEvents.
   * Assumes events are sorted in ascending order by version.
   */
  public static rehydrate(events: DomainEvent[]): Reservation {
    if (!events || events.length === 0) {
      throw new Error(
        'No events provided to rehydrate the Reservation aggregate',
      )
    }

    events.sort((a, b) => a.version - b.version)

    let reservation: Reservation | undefined

    for (const event of events) {
      reservation =
        reservation ??
        (() => {
          // For the first (creation) event, instantiate a new aggregate.
          if (event.eventType === RESERVATION_CREATED) {
            const temp = new Reservation(
              event.aggregateId,
              event.payload, // Assumes payload matches ReservationProps
              new Date(event.timestamp),
              new Date(event.timestamp),
            )
            temp.version = event.version
            return temp
          }
          throw new Error('First event must be a ReservationCreated event')
        })()
      // Apply subsequent events using the abstract applyEvent method.
      reservation.applyEvent(event)
      reservation.version = event.version
    }
    if (!reservation) {
      throw new Error('Failed to rehydrate the Reservation aggregate')
    }
    return reservation
  }

  /**
   * Implementation of the abstract applyEvent from AggregateRoot.
   * Only mutable properties are updated.
   */
  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case RESERVATION_CREATED: {
        // Since immutable properties (reservationId, userId, isbn) are set during creation,
        // we update only mutable fields:
        this.createdAt = new Date(event.timestamp)
        this.updatedAt = new Date(event.timestamp)
        // Status, dueDate, and feeCharged should already be set appropriately on creation.
        break
      }
      case RESERVATION_RETURNED: {
        // Update mutable properties when reservation is marked as returned.
        // We assume the event payload includes "updatedStatus" (or default to RETURNED).
        this.status = event.payload.updatedStatus || RESERVATION_STATUS.RETURNED
        this.updatedAt = new Date(event.timestamp)
        break
      }
      default:
        console.warn(`Unhandled event type in applyEvent: ${event.eventType}`)
    }
  }
}
