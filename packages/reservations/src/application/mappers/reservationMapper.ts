import { schemas } from '@book-library-tool/api'
import type { DomainReservation } from '@reservations/entities/DomainReservation.js'
import { omitBy } from 'lodash-es'

export function toApiReservation(dto: DomainReservation): schemas.Reservation {
  const raw = {
    id: dto.id,
    userId: dto.userId,
    bookId: dto.bookId,
    status: dto.status,
    feeCharged: dto.feeCharged,
    retailPrice: dto.retailPrice,
    reservedAt: dto.reservedAt.toISOString(),
    dueDate: dto.dueDate.toISOString(),
    createdAt: dto.createdAt.toISOString(),
    updatedAt: dto.updatedAt?.toISOString(),
    deletedAt: dto.deletedAt?.toISOString(),
    version: dto.version,
    payment: dto.payment && {
      date: dto.payment.date.toISOString(),
      amount: dto.payment.amount,
      method: dto.payment.method,
      reference: dto.payment.reference,
      received: dto.payment.received ?? false,
      failReason: dto.payment.failReason ?? undefined,
    },
  }

  // Drop any keys whose value is undefined or null
  const clean = omitBy(raw, (value) => value == null)

  // Type assertion is safe now that we've stripped undefined
  return clean as schemas.Reservation
}
