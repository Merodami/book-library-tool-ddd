import { WalletDTO } from '@book-library-tool/api'

/**
 * Repository interface for wallet read operations
 */
export interface IWalletProjectionRepository {
  /**
   * Gets a wallet by user ID
   */
  getWalletByUserId(userId: string): Promise<WalletDTO | null>

  /**
   * Saves a new wallet projection from a WalletCreated event.
   *
   * @param walletData - Data for the new wallet projection
   */
  saveWallet(walletData: WalletDTO): Promise<void>

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
