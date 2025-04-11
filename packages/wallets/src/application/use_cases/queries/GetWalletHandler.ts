import { Wallet } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { IWalletProjectionRepository } from '@repositories/IWalletProjectionRepository.js'

/**
 * Query handler for retrieving wallet information
 */
export class GetWalletHandler {
  constructor(
    private readonly walletProjectionRepository: IWalletProjectionRepository,
  ) {}

  /**
   * Gets a wallet by user ID
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
