import { makeValidator, schemas } from '@book-library-tool/api'
import { RESERVATION_STATUS } from '@book-library-tool/types'
import { randomUUID } from 'crypto'

const assertReservationSchema = makeValidator(schemas.ReservationSchema)

export class Reservation {
  private constructor(
    public readonly reservationId: string,
    public readonly userId: string,
    public readonly isbn: string,
    public readonly reservedAt: Date,
    public readonly dueDate: Date,
    public status: RESERVATION_STATUS,
    public feeCharged: number,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public readonly deletedAt?: Date,
  ) {}

  static create(
    props: Partial<schemas.ReservationDTO> &
      Pick<schemas.ReservationDTO, 'userId' | 'isbn' | 'reservedAt' | 'status'>,
  ) {
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

    const reservationId = props.reservationId || randomUUID()

    assertReservationSchema({
      ...props,
      reservationId,
      dueDate: dueDate.toISOString(),
      feeCharged,
    })

    return new Reservation(
      reservationId,
      props.userId.trim(),
      props.isbn.trim(),
      props.reservedAt ? new Date(props.reservedAt) : now,
      dueDate,
      props.status as RESERVATION_STATUS,
      feeCharged,
    )
  }

  static rehydrate(raw: schemas.ReservationDTO): Reservation {
    // Validate the raw data against your schema.
    assertReservationSchema(raw)

    const now = new Date()

    return new Reservation(
      raw.reservationId,
      raw.userId,
      raw.isbn,
      new Date(raw.reservedAt),
      new Date(raw.dueDate),
      raw.status as RESERVATION_STATUS,
      Number(raw.feeCharged),
      raw.createdAt ? new Date(raw.createdAt) : now,
      raw.updatedAt ? new Date(raw.updatedAt) : now,
      raw.deletedAt ? new Date(raw.deletedAt) : undefined,
    )
  }

  /**
   * Marks this reservation as returned.
   * Throws an error if the reservation is not in a state that can be returned.
   */
  markAsReturned(): void {
    // Only reservations in RESERVED, BORROWED, or LATE states can be returned.
    if (
      this.status !== RESERVATION_STATUS.RESERVED &&
      this.status !== RESERVATION_STATUS.BORROWED &&
      this.status !== RESERVATION_STATUS.LATE
    ) {
      throw new Error('Reservation cannot be returned in its current status')
    }

    this.status = RESERVATION_STATUS.RETURNED
    this.updatedAt = new Date()
  }
}
