import { DomainWallet } from '@wallets/entities/DomainWallet.js'
import { isLeft } from 'fp-ts/lib/Either.js'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/lib/PathReporter.js'
import { UUID } from 'io-ts-types/lib/UUID.js'
import { has, isString, mapValues } from 'lodash-es'
import { omitBy } from 'lodash-es'
import { isDate, isPlainObject } from 'lodash-es'

import { WalletDocument } from '../documents/WalletDocument.js'

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

// /**
//  * Payment sub-document (all fields optional to handle partial data)
//  */
// const RawPaymentCodec = t.partial({
//   date: DateFromUnknown,
//   amount: t.number,
//   received: t.boolean,
//   method: t.union([t.string, t.null]),
//   reference: t.union([t.string, t.null]),
//   failReason: t.union([t.string, t.null]),
// })

// /**
//  * Reservation: optional fields (required for validation but GraphQL filtering requires all fields)
//  */
// const ReservationRequired = t.partial({
//   id: UUIDCodec,
//   userId: t.string,
//   bookId: t.string,
//   status: StatusCodec,
//   feeCharged: t.number,
//   retailPrice: t.number,
//   version: t.number,
//   createdAt: DateFromUnknown,
//   reservedAt: DateFromUnknown,
//   dueDate: DateFromUnknown,
// })

/**
 * Wallet: required fields
 */
const WalletRequired = t.partial({
  id: UUIDCodec,
  userId: t.string,
  balance: t.number,
  version: t.number,
  createdAt: DateFromUnknown,
  updatedAt: DateFromUnknown,
  deletedAt: DateFromUnknown,
})

const WalletOptional = t.partial({
  id: UUIDCodec,
  userId: t.string,
  balance: t.number,
  version: t.number,
  createdAt: DateFromUnknown,
})

export const WalletDocCodec = t.intersection([WalletRequired, WalletOptional])
export type ReservationDoc = t.TypeOf<typeof WalletDocCodec>

/**
 * Map raw Mongo DB document → DomainWallet.
 * First strips out any `undefined` leaves, then decodes,
 * then applies sensible defaults (e.g. lateFee→0).
 */
export function mapToDomain(raw: unknown): DomainWallet {
  const cleaned = omitUndefinedDeep(raw)

  const decoded = WalletDocCodec.decode(cleaned)

  if (isLeft(decoded)) {
    const report = PathReporter.report(decoded).join('; ')

    console.error('Failed raw data:', JSON.stringify(cleaned, null, 2))

    throw new Error(`ReservationDoc validation failed: ${report}`)
  }

  const doc = decoded.right

  return {
    id: doc.id ?? undefined,
    userId: doc.userId ?? undefined,
    balance: doc.balance ?? undefined,
    version: doc.version ?? undefined,
    createdAt: doc.createdAt ?? undefined,
    updatedAt: doc.updatedAt ?? undefined,
    deletedAt: doc.deletedAt ?? undefined,
  }
}

/**
 * Map a DomainWallet back into the shape of the MongoDB document.
 */
export function mapToDocument(res: DomainWallet): WalletDocument {
  return {
    id: res.id,
    userId: res.userId,
    balance: res.balance,
    version: res.version,
    createdAt: res.createdAt,
  }
}
