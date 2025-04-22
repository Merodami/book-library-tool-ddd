import { DomainWallet } from '@wallets/entities/DomainWallet.js'

/**
 * Repository interface for wallet read operations
 */
export interface IWalletReadProjectionRepository {
  /**
   * Gets a wallet by user ID
   */
  getWalletByUserId(userId: string): Promise<DomainWallet | null>
}
