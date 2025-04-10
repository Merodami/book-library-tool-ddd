import { makeValidator, schemas } from '@book-library-tool/api'
import {
  AggregateRoot,
  DomainEvent,
  RESERVATION_CANCELLED,
  RESERVATION_CONFIRMED,
  RESERVATION_CREATED,
  RESERVATION_REJECTED,
  RESERVATION_RETURNED,
} from '@book-library-tool/event-store'
import { Errors, logger } from '@book-library-tool/shared'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { randomUUID } from 'crypto'

const assertReservationSchema = makeValidator(schemas.ReservationSchema)

export interface ReservationProps {
  userId: string
  isbn: string
  reservedAt: Date
  dueDate: Date
  status: RESERVATION_STATUS
  feeCharged: number
}

/**
 * The Reservation aggregate extends AggregateRoot, inheriting a surrogate ID,
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
    this.reservationId = id || randomUUID()
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
      Pick<schemas.ReservationDTO, 'userId' | 'isbn'>,
  ): { reservation: Reservation; event: DomainEvent } {
    const now = new Date()

    // Calculate due date based on environment setting or default to 5 days
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

    // Calculate fee based on environment setting or default to 3
    const feeCharged = props.feeCharged
      ? Number(props.feeCharged)
      : Number(process.env.BOOK_RESERVATION_FEE) || 3

    // Generate a temporary reservationId for validation
    const reservationId = props.reservationId || randomUUID()

    // Validate the reservation data
    assertReservationSchema({
      ...props,
      reservationId,
      dueDate: dueDate.toISOString(),
      feeCharged,
    })

    // Create reservation properties
    const reservationProps: ReservationProps = {
      userId: props.userId.trim(),
      isbn: props.isbn.trim(),
      reservedAt: props.reservedAt ? new Date(props.reservedAt) : now,
      dueDate,
      status:
        (props.status as RESERVATION_STATUS) || RESERVATION_STATUS.RESERVED,
      feeCharged,
    }

    // Create a new reservation instance
    const reservation = new Reservation(undefined, reservationProps, now, now)

    // Create the domain event
    const event: DomainEvent = {
      aggregateId: reservation.id,
      eventType: RESERVATION_CREATED,
      payload: {
        ...reservationProps,
        reservationId: reservation.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dueDate: dueDate.toISOString(),
        reservedAt: reservationProps.reservedAt.toISOString(),
      },
      timestamp: now,
      version: 1,
      schemaVersion: 1,
    }

    reservation.addDomainEvent(event)

    return { reservation, event }
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

    // Sort events by version to ensure correct order
    events.sort((a, b) => a.version - b.version)

    let reservation: Reservation | undefined

    for (const event of events) {
      // Initialize the aggregate with the first event
      reservation =
        reservation ??
        (() => {
          // For the first (creation) event, instantiate a new aggregate
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

      // Apply subsequent events
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
        // Update creation timestamps
        this.createdAt = new Date(event.timestamp)
        this.updatedAt = new Date(event.timestamp)
        break
      }
      case RESERVATION_RETURNED:
      case RESERVATION_CANCELLED:
      case RESERVATION_CONFIRMED:
      case RESERVATION_REJECTED: {
        // All state transitions update status and timestamp
        this.status =
          event.payload.updatedStatus ||
          this.getStatusFromEventType(event.eventType)
        this.updatedAt = new Date(event.timestamp)
        break
      }
      default:
        logger.warn(`Unhandled event type in applyEvent: ${event.eventType}`)
    }
  }

  /**
   * Helper method to map event types to status values
   */
  private getStatusFromEventType(eventType: string): RESERVATION_STATUS {
    switch (eventType) {
      case RESERVATION_RETURNED:
        return RESERVATION_STATUS.RETURNED
      case RESERVATION_CANCELLED:
        return RESERVATION_STATUS.CANCELLED
      case RESERVATION_CONFIRMED:
        return RESERVATION_STATUS.CONFIRMED
      case RESERVATION_REJECTED:
        return RESERVATION_STATUS.REJECTED
      default:
        return this.status
    }
  }

  /**
   * Creates a state transition for the reservation with a new status.
   * This is a private helper method to reduce code duplication in state transition methods.
   */
  private createStateTransition(
    newStatus: RESERVATION_STATUS,
    eventType: string,
    additionalPayload: Record<string, any> = {},
  ): { reservation: Reservation; event: DomainEvent } {
    const now = new Date()
    const newVersion = this.version + 1

    // Create updated props
    const updatedProps: ReservationProps = {
      userId: this.userId,
      isbn: this.isbn,
      reservedAt: this.reservedAt,
      dueDate: this.dueDate,
      status: newStatus,
      feeCharged: this.feeCharged,
    }

    // Create a new reservation instance with updated properties
    const updatedReservation = new Reservation(
      this.id,
      updatedProps,
      this.createdAt,
      now,
      this.deletedAt,
    )

    // Generate standard payload fields
    const actionName = eventType.replace('Reservation', '').toLowerCase()
    const basePayload = {
      reservationId: this.reservationId,
      previousStatus: this.status,
      updatedStatus: newStatus,
      [`${actionName}At`]: now.toISOString(),
    }

    // Create the event with combined payload
    const event: DomainEvent = {
      aggregateId: this.id,
      eventType,
      payload: {
        ...basePayload,
        ...additionalPayload,
      },
      timestamp: now,
      version: newVersion,
      schemaVersion: 1,
    }

    updatedReservation.addDomainEvent(event)
    return { reservation: updatedReservation, event }
  }

  /**
   * Validates if a state transition is allowed from the current state.
   * Throws an appropriate error if the transition is not allowed.
   */
  private validateStateTransition(
    allowedStates: RESERVATION_STATUS[],
    actionName: string,
  ): void {
    if (!allowedStates.includes(this.status)) {
      const errorCode = `RESERVATION_CANNOT_BE_${actionName.toUpperCase()}`
      const errorMessage = `Reservation with id ${this.reservationId} cannot be ${actionName.toLowerCase()} in its current status.`

      throw new Errors.ApplicationError(400, errorCode, errorMessage)
    }
  }

  /**
   * Domain method to mark the reservation as returned.
   */
  public markAsReturned(): { reservation: Reservation; event: DomainEvent } {
    this.validateStateTransition(
      [
        RESERVATION_STATUS.RESERVED,
        RESERVATION_STATUS.BORROWED,
        RESERVATION_STATUS.LATE,
      ],
      'returned',
    )

    return this.createStateTransition(
      RESERVATION_STATUS.RETURNED,
      RESERVATION_RETURNED,
    )
  }

  /**
   * Domain method to cancel the reservation.
   */
  public cancel(reason?: string): {
    reservation: Reservation
    event: DomainEvent
  } {
    this.validateStateTransition(
      [
        RESERVATION_STATUS.RESERVED,
        RESERVATION_STATUS.BORROWED,
        RESERVATION_STATUS.LATE,
      ],
      'cancelled',
    )

    return this.createStateTransition(
      RESERVATION_STATUS.CANCELLED,
      RESERVATION_CANCELLED,
      { reason: reason || 'No reason provided' },
    )
  }

  /**
   * Domain method to confirm a reservation after book validation.
   */
  public confirm(): { reservation: Reservation; event: DomainEvent } {
    this.validateStateTransition([RESERVATION_STATUS.RESERVED], 'confirmed')

    return this.createStateTransition(
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_CONFIRMED,
    )
  }

  /**
   * Domain method to reject a reservation after book validation fails.
   */
  public reject(reason: string): {
    reservation: Reservation
    event: DomainEvent
  } {
    this.validateStateTransition([RESERVATION_STATUS.RESERVED], 'rejected')

    return this.createStateTransition(
      RESERVATION_STATUS.REJECTED,
      RESERVATION_REJECTED,
      { reason },
    )
  }
}
