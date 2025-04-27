import { schemas } from '@book-library-tool/api'
import type { DomainWallet } from '@wallets/domain/index.js'
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
 * Map a DomainWallet (with Date fields) into the HTTP DTO,
 * dropping undefined but preserving null for nullable schema properties.
 */
export function toApiWallet(dto: DomainWallet): schemas.WalletDTO {
  const raw = {
    id: dto.id,
    userId: dto.userId,
    balance: dto.balance,
    version: dto.version,

    // Required dates, always present
    createdAt: formatDate(dto.createdAt)!,

    // Optional dates
    updatedAt: formatDate(dto.updatedAt),
    deletedAt: formatDate(dto.deletedAt),
  }

  // Only strip out the truly missing fields (undefined), keep nulls intact
  const clean = omitBy(raw, (v) => v === undefined)

  return clean as schemas.WalletDTO
}
