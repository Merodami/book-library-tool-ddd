import { DomainWallet } from '@wallets/entities/DomainWallet.js'

/**
 * Repository interface for wallet write operations
 */
export interface IWalletWriteProjectionRepository {
  /**
   * Saves a new wallet projection from a WalletCreated event.
   *
   * @param walletData - Data for the new wallet projection
   */
  saveWallet(walletData: DomainWallet): Promise<void>

  /**
   * Updates a wallet's balance.
   *
   * @param id - The wallet ID
   * @param newBalance - The new balance amount
   * @param version - The new version number
   * @param timestamp - The timestamp of the update
   */
  updateWalletBalance(
    id: string,
    newBalance: number,
    version: number,
    timestamp: Date,
  ): Promise<void>
}
