import { logger } from '@book-library-tool/shared'
import type { DomainBook } from '@books/domain/index.js'
import type { BookDocument } from '@books/infrastructure/index.js'
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
 * Book: required fields (required for validation but GraphQL filtering requires all fields)
 */
const BookRequired = t.partial({
  id: UUIDCodec,
  isbn: t.string,
  title: t.string,
  author: t.string,
  publicationYear: t.number,
  publisher: t.string,
  price: t.number,
  version: t.number,
  createdAt: DateFromUnknown,
})

/**
 * Book: optional fields
 */
const BookOptional = t.partial({
  updatedAt: t.union([DateFromUnknown, t.null]),
  deletedAt: t.union([DateFromUnknown, t.null]),
})

export const BookDocCodec = t.intersection([BookRequired, BookOptional])
export type BookDoc = t.TypeOf<typeof BookDocCodec>

/**
 * Map raw Mongo DB document → DomainBook.
 * First strips out any `undefined` leaves, then decodes,
 * then applies sensible defaults.
 */
export function mapToDomain(raw: unknown): DomainBook {
  const cleaned = omitUndefinedDeep(raw)

  const decoded = BookDocCodec.decode(cleaned)

  if (isLeft(decoded)) {
    const report = PathReporter.report(decoded).join('; ')

    logger.error('Failed raw data:', JSON.stringify(cleaned, null, 2))

    throw new Error(`BookDoc validation failed: ${report}`)
  }

  const doc = decoded.right

  return {
    id: doc.id ?? undefined,
    isbn: doc.isbn ?? undefined,
    title: doc.title ?? undefined,
    author: doc.author ?? undefined,
    publicationYear: doc.publicationYear ?? undefined,
    publisher: doc.publisher ?? undefined,
    price: doc.price ?? undefined,
    version: doc.version ?? undefined,
    createdAt: doc.createdAt ?? undefined,
    updatedAt: doc.updatedAt ?? undefined,
    deletedAt: doc.deletedAt ?? undefined,
  }
}

/**
 * Map a DomainBook back into the shape of the MongoDB document.
 */
export function mapToDocument(book: DomainBook): BookDocument {
  return {
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publicationYear: book.publicationYear,
    publisher: book.publisher,
    price: book.price,
    version: book.version,
    createdAt: book.createdAt ?? new Date(),
    updatedAt: book.updatedAt,
    deletedAt: book.deletedAt,
  }
}
