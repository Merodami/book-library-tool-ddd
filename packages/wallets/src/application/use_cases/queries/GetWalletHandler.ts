import { ErrorCode, Errors } from '@book-library-tool/shared'
import { DomainWallet } from '@wallets/entities/DomainWallet.js'
import { IWalletReadProjectionRepository } from '@wallets/repositories/IWalletReadProjectionRepository.js'

/**
 * Query handler for retrieving wallet information.
 * This class implements the query side of the CQRS pattern, providing
 * read-only access to wallet data through the projection repository.
 *
 * The handler is responsible for:
 * - Retrieving wallet information by user ID
 * - Handling cases where the wallet is not found
 * - Providing appropriate error responses
 * - Maintaining separation between read and write operations
 */
export class GetWalletHandler {
  constructor(
    private readonly walletReadProjectionRepository: IWalletReadProjectionRepository,
  ) {}

  /**
   * Gets a wallet by user ID from the read model.
   * This method queries the wallet projection to retrieve the current
   * state of a user's wallet. It throws an appropriate error if the
   * wallet is not found.
   *
   * @param query - The query parameters
   * @param query.userId - The ID of the user whose wallet to retrieve
   * @returns Promise resolving to the wallet DTO if found
   * @throws {ApplicationError} If:
   *   - The wallet is not found (404)
   *   - The repository operation fails
   */
  async execute(query: { id: string }): Promise<DomainWallet | null> {
    const wallet = await this.walletReadProjectionRepository.getWallet({
      id: query.id,
    })

    if (!wallet) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.WALLET_NOT_FOUND,
        `Wallet not found for id ${query.id}`,
      )
    }

    return wallet
  }
}
