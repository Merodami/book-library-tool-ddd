import { DomainWallet } from '@wallets/domain/entities/DomainWallet.js'

/**
 * Repository interface for wallet read operations
 */
export interface WalletReadProjectionRepositoryPort {
  /**
   * Retrieves a wallet by either ID or user ID from the projection store.
   * This method implements several optimizations:
   * - Field projection to minimize data transfer
   * - Soft delete filtering
   * - Comprehensive error handling
   *
   * @param param - Object containing either id or userId
   * @param param.id - The ID of the wallet to retrieve
   * @param param.userId - The ID of the user whose wallet to retrieve
   * @returns Promise resolving to the wallet DTO or null if not found
   * @throws {ApplicationError} If:
   *   - Neither id nor userId is provided (400)
   *   - Collection is not initialized (500)
   *   - Database operation fails (500)
   */
  getWallet({
    id,
    userId,
  }: {
    id?: string
    userId?: string
  }): Promise<DomainWallet | null>
}
