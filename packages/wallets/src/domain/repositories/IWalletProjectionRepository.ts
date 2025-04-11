import { WalletDTO } from '@book-library-tool/api/src/schemas/wallets.js'

/**
 * Repository interface for wallet read operations
 */
export interface IWalletProjectionRepository {
  /**
   * Gets a wallet by user ID
   */
  getWalletByUserId(userId: string): Promise<WalletDTO | null>
}
