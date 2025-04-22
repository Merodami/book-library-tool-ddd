import { schemas } from '@book-library-tool/api'
import type { DomainReservation } from '@reservations/entities/DomainReservation.js'
import { omitBy } from 'lodash-es'

/**
 * Safely format a Date or ISO‐string into an ISO‐string,
 * returning undefined only if the input was nullish.
 */
function formatDate(value?: Date | string | null): string | undefined {
  if (value == null) return undefined

  return value instanceof Date ? value.toISOString() : value
}

/**
 * Map a DomainReservation (with Date fields) into the HTTP DTO,
 * dropping undefined but preserving null for nullable schema properties.
 */
export function toApiReservation(
  dto: DomainReservation | schemas.Reservation,
): schemas.Reservation {
  const raw = {
    id: dto.id,
    userId: dto.userId,
    bookId: dto.bookId,
    status: dto.status,
    feeCharged: dto.feeCharged,
    retailPrice: dto.retailPrice,

    // lateFee is number | undefined in the schema; map null → undefined so it's omitted
    lateFee: (dto as any).lateFee == null ? undefined : dto.lateFee,

    // Required dates, always present
    reservedAt: formatDate((dto as any).reservedAt)!,
    dueDate: formatDate((dto as any).dueDate)!,
    createdAt: formatDate((dto as any).createdAt)!,

    // Optional dates
    updatedAt: formatDate((dto as any).updatedAt),
    deletedAt: formatDate((dto as any).deletedAt),
    returnedAt: formatDate((dto as any).returnedAt),

    version: dto.version,

    // statusReason is string | null in schema
    statusReason: (dto as any).statusReason === null ? null : undefined, // will be dropped if undefined

    // payment object is entirely optional
    payment: dto.payment && {
      date: formatDate(dto.payment.date)!,
      amount: dto.payment.amount,
      method: dto.payment.method, // string | null
      reference: dto.payment.reference, // string | null
      received: dto.payment.received,
      // failReason is string | null
      failReason: dto.payment.failReason === null ? null : undefined,
    },
  }

  // Only strip out the truly missing fields (undefined), keep nulls intact
  const clean = omitBy(raw, (v) => v === undefined)

  return clean as schemas.Reservation
}
