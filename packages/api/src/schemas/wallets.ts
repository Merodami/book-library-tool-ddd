import { Static, Type } from '@sinclair/typebox'

// --------------------------------
// Common Schema Components
// --------------------------------

// --------------------------------
// Query Schemas
// --------------------------------

/**
 * Balance Wallet Request Schema
 */
export const WalletBalanceRequestSchema = Type.Object(
  {
    amount: Type.Number(),
  },
  { $id: '#/components/schemas/WalletBalanceRequest' },
)
export type WalletBalanceRequest = Static<typeof WalletBalanceRequestSchema>
export const WalletBalanceRequestRef = Type.Ref(
  '#/components/schemas/BalanceWalletRequest',
)

/**
 * Late Return Request Schema
 */
export const LateReturnRequestSchema = Type.Object(
  {
    daysLate: Type.Number({ minimum: 0 }),
    retailPrice: Type.Number({ minimum: 0 }),
  },
  { $id: '#/components/schemas/LateReturnRequest' },
)
export type LateReturnRequest = Static<typeof LateReturnRequestSchema>
export const LateReturnRequestRef = Type.Ref(
  '#/components/schemas/LateReturnRequest',
)

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * Wallet Schema
 */
export const WalletSchema = Type.Object(
  {
    userId: Type.String({ format: 'uuid' }),
    balance: Type.Number(),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' })),
    deletedAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
  { $id: '#/components/schemas/Wallet' },
)
export type WalletDTO = Static<typeof WalletSchema>
export const WalletRef = Type.Ref('#/components/schemas/Wallet')
