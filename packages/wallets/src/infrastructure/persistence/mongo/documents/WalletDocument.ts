/**
 * Database document representation of a wallet with MongoDB native types
 */
export interface WalletDocument {
  id?: string
  userId?: string
  balance?: number
  version?: number
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date
}
