import { schemas } from '@book-library-tool/api'
import type { DomainBook } from '@books/domain/index.js'
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
 * Map a DomainBook (with Date fields) into the HTTP DTO,
 * dropping undefined but preserving null for nullable schema properties.
 */
export function toApiBook(dto: DomainBook): schemas.Book {
  const domainBook = dto as DomainBook
  const raw = {
    id: dto.id,
    isbn: dto.isbn,
    title: dto.title,
    author: dto.author,
    publicationYear: dto.publicationYear,
    publisher: dto.publisher,
    price: dto.price,
    version: dto.version,

    // Required dates, always present
    createdAt: formatDate((dto as any).createdAt)!,

    // Optional dates
    updatedAt: formatDate((dto as any).updatedAt),
    deletedAt: formatDate((dto as any).deletedAt),

    // Optional metadata
    metadata: domainBook.metadata && {
      condition: domainBook.metadata.condition,
      acquisitionDate: formatDate(domainBook.metadata.acquisitionDate),
      lastMaintenanceDate: formatDate(domainBook.metadata.lastMaintenanceDate),
      notes: domainBook.metadata.notes,
    },
  }

  // Only strip out the truly missing fields (undefined), keep nulls intact
  const clean = omitBy(raw, (v) => v === undefined)

  return clean as schemas.Book
}
