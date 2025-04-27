export const WalletFieldEnum = {
  id: 'id',
  userId: 'userId',
  balance: 'balance',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
} as const

export const WalletSortFieldEnum = {
  ...WalletFieldEnum,
  balance: 'balance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
} as const

export const WalletEventEnum = {
  WALLET_CREATED: 'WALLET_CREATED',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_BALANCE_UPDATED: 'WALLET_BALANCE_UPDATED',
  WALLET_LATE_FEE_APPLIED: 'WALLET_LATE_FEE_APPLIED',
  WALLET_DELETED: 'WALLET_DELETED',
  WALLET_BALANCE_RESERVED: 'WALLET_BALANCE_RESERVED',
  WALLET_PAYMENT_SUCCESS: 'WALLET_PAYMENT_SUCCESS',
  WALLET_PAYMENT_DECLINED: 'WALLET_PAYMENT_DECLINED',
} as const
