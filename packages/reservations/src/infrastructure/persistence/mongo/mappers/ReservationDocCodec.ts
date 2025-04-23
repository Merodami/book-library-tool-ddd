import { RESERVATION_STATUS } from '@book-library-tool/types'
import { DomainReservation } from '@reservations/entities/DomainReservation.js'
import { ReservationDocument } from '@reservations/persistence/mongo/documents/ReservationDocument.js'
import { isLeft } from 'fp-ts/lib/Either.js'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/lib/PathReporter.js'
import { UUID } from 'io-ts-types/lib/UUID.js'
import { has, isString, mapValues } from 'lodash-es'
import { omitBy } from 'lodash-es'
import { isDate, isPlainObject } from 'lodash-es'

/**
 * Recursively strips out any property whose value is `undefined`,
 * but leaves Date instances (and primitives) intact.
 */
function omitUndefinedDeep(u: unknown): unknown {
  // Handle Date objects
  if (isDate(u)) {
    return u
  }

  // Handle arrays
  if (Array.isArray(u)) {
    return u.map(omitUndefinedDeep)
  }

  // Handle plain objects (safer check than typeof === 'object')
  if (isPlainObject(u)) {
    // First omit undefined values
    const withoutUndefined = omitBy(
      u as Record<string, any>,
      (value) => value === undefined,
    )

    // Then recursively process remaining values
    return mapValues(withoutUndefined, omitUndefinedDeep)
  }

  // Return primitives as-is
  return u
}

/**
 * Flexible Date codec: accepts Date, ISO‑string, or MongoDB's { $date: "…" }
 * Using Lodash for safer type checking
 */
const DateFromUnknown = new t.Type<Date, unknown, unknown>(
  'DateFromUnknown',
  (u): u is Date => isDate(u) && !isNaN(u.valueOf()),
  (u, c) => {
    // Handle Date objects
    if (isDate(u) && !isNaN(u.valueOf())) {
      return t.success(u)
    }

    // Handle ISO date strings
    if (isString(u)) {
      const d = new Date(u)

      return isNaN(d.valueOf())
        ? t.failure(u, c, 'Invalid ISO 8601 date string')
        : t.success(d)
    }

    // Handle MongoDB style { $date: "..." } objects
    if (isPlainObject(u) && has(u, '$date')) {
      const dateValue = (u as any).$date

      if (isString(dateValue)) {
        const d = new Date(dateValue)

        return isNaN(d.valueOf())
          ? t.failure(u, c, 'Invalid {$date: …} value')
          : t.success(d)
      }
    }

    return t.failure(u, c, 'Expected Date | ISO‑string | {$date: string}')
  },
  t.identity,
)

/**
 * UUID codec
 */
const UUIDCodec = UUID

/**
 * Status codec
 */
const StatusCodec = t.keyof(
  Object.values(RESERVATION_STATUS).reduce<Record<string, null>>(
    (acc, s) => ({ ...acc, [s]: null }),
    {},
  ),
)

/**
 * Payment sub-document (all fields optional to handle partial data)
 */
const RawPaymentCodec = t.partial({
  date: DateFromUnknown,
  amount: t.number,
  received: t.boolean,
  method: t.union([t.string, t.null]),
  reference: t.union([t.string, t.null]),
  failReason: t.union([t.string, t.null]),
})

/**
 * Reservation: optional fields (required for validation but GraphQL filtering requires all fields)
 */
const ReservationRequired = t.partial({
  id: UUIDCodec,
  userId: t.string,
  bookId: t.string,
  status: StatusCodec,
  feeCharged: t.number,
  retailPrice: t.number,
  version: t.number,
  createdAt: DateFromUnknown,
  reservedAt: DateFromUnknown,
  dueDate: DateFromUnknown,
})

/**
 * Reservation: optional fields
 */
const ReservationOptional = t.partial({
  lateFee: t.union([t.number, t.null]),
  updatedAt: t.union([DateFromUnknown, t.null]),
  deletedAt: t.union([DateFromUnknown, t.null]),
  returnedAt: t.union([DateFromUnknown, t.null]),
  statusReason: t.union([t.string, t.null]),
  payment: RawPaymentCodec,
})

export const ReservationDocCodec = t.intersection([
  ReservationRequired,
  ReservationOptional,
])
export type ReservationDoc = t.TypeOf<typeof ReservationDocCodec>

/**
 * Map raw Mongo DB document → DomainReservation.
 * First strips out any `undefined` leaves, then decodes,
 * then applies sensible defaults (e.g. lateFee→0).
 */
export function mapToDomain(raw: unknown): DomainReservation {
  const cleaned = omitUndefinedDeep(raw)

  const decoded = ReservationDocCodec.decode(cleaned)

  if (isLeft(decoded)) {
    const report = PathReporter.report(decoded).join('; ')

    console.error('Failed raw data:', JSON.stringify(cleaned, null, 2))

    throw new Error(`ReservationDoc validation failed: ${report}`)
  }

  const doc = decoded.right

  return {
    id: doc.id ?? undefined,
    userId: doc.userId ?? undefined,
    bookId: doc.bookId ?? undefined,
    status: (doc.status as RESERVATION_STATUS) ?? undefined,
    feeCharged: doc.feeCharged ?? undefined,
    retailPrice: doc.retailPrice ?? undefined,
    version: doc.version ?? undefined,
    lateFee: doc.lateFee ?? undefined,
    createdAt: doc.createdAt ?? undefined,
    reservedAt: doc.reservedAt ?? undefined,
    dueDate: doc.dueDate ?? undefined,
    updatedAt: doc.updatedAt ?? undefined,
    deletedAt: doc.deletedAt ?? undefined,
    returnedAt: doc.returnedAt ?? undefined,
    statusReason: doc.statusReason ?? undefined,
    payment: doc.payment
      ? {
          date: doc.payment.date ?? undefined,
          amount: doc.payment.amount ?? undefined,
          method: doc.payment.method ?? undefined,
          reference: doc.payment.reference ?? undefined,
          received: doc.payment.received ?? undefined,
          failReason: doc.payment.failReason ?? undefined,
        }
      : undefined,
  }
}

/**
 * Map a DomainReservation back into the shape of the MongoDB document.
 */
export function mapToDocument(res: DomainReservation): ReservationDocument {
  return {
    id: res.id,
    userId: res.userId,
    bookId: res.bookId,
    status: res.status,
    feeCharged: res.feeCharged,
    retailPrice: res.retailPrice,
    lateFee: res.lateFee,
    version: res.version,
    createdAt: res.createdAt,
    reservedAt: res.reservedAt,
    dueDate: res.dueDate,
    returnedAt: res.returnedAt,
    updatedAt: res.updatedAt,
    deletedAt: res.deletedAt,
    statusReason: res.statusReason,
    payment: res.payment
      ? {
          date: res.payment.date,
          amount: res.payment.amount,
          method: res.payment.method,
          reference: res.payment.reference,
          received: res.payment.received ?? false,
          failReason: res.payment.failReason,
        }
      : undefined,
  }
}
