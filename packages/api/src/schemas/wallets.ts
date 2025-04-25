import {
  createFieldsSelectionSchema,
  createSortSchema,
} from '@api/schemas/helper/helper.js'
import { createPaginationSchema } from '@api/schemas/helper/helper.js'
import { WalletFieldEnum, WalletSortFieldEnum } from '@book-library-tool/sdk'
import { Static, Type } from '@sinclair/typebox'

// --------------------------------
// Query Schemas
// --------------------------------

/**
 * Wallet Field Schema
 */
export const WalletFieldSchema = Type.Enum(WalletFieldEnum, {
  $id: '#/components/schemas/WalletField',
})

export type WalletField = Static<typeof WalletFieldSchema>

export const WalletSortFieldSchema = Type.Enum(WalletSortFieldEnum, {
  $id: '#/components/schemas/WalletSortField',
})

export type WalletSortField = Static<typeof WalletSortFieldSchema>

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

/**
 * Wallet Search Query Schema
 */
export const WalletSearchQuerySchema = Type.Object(
  {
    userId: Type.Optional(Type.String({ minLength: 1 })),
    balance: Type.Optional(Type.Number()),
    createdAt: Type.Optional(Type.String({ minLength: 1 })),
    updatedAt: Type.Optional(Type.String({ minLength: 1 })),
    deletedAt: Type.Optional(Type.String({ minLength: 1 })),

    // Pagination and sort
    ...createPaginationSchema(),
    ...createSortSchema(WalletSortFieldSchema),

    // GraphQL fields selection
    fields: createFieldsSelectionSchema(WalletFieldSchema),
  },
  { additionalProperties: false },
)
export type WalletSearchQuery = Static<typeof WalletSearchQuerySchema>
export const WalletSearchQueryRef = Type.Ref(
  '#/components/schemas/WalletSearchQuery',
)

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * Wallet Schema
 */
export const WalletSchema = Type.Object(
  {
    id: Type.Optional(
      Type.String({
        format: 'uuid',
        minLength: 1,
        pattern: '^(?!\\s*$).+',
      }),
    ),
    userId: Type.Optional(
      Type.String({
        format: 'uuid',
        minLength: 1,
        pattern: '^(?!\\s*$).+',
      }),
    ),
    balance: Type.Number({ minimum: 0 }),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' })),
    deletedAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
  { $id: '#/components/schemas/Wallet' },
)
export type WalletDTO = Static<typeof WalletSchema>
export const WalletRef = Type.Ref('#/components/schemas/Wallet')
