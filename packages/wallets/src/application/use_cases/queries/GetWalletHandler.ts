import { Wallet } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { IWalletProjectionRepository } from '@repositories/IWalletProjectionRepository.js'

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
    private readonly walletProjectionRepository: IWalletProjectionRepository,
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
  async execute(query: { userId: string }): Promise<Wallet | null> {
    const wallet = await this.walletProjectionRepository.getWalletByUserId(
      query.userId,
    )

    if (!wallet) {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.WALLET_NOT_FOUND,
        `Wallet not found for user ${query.userId}`,
      )
    }

    return wallet
  }
}
