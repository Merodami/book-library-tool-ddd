import { BaseReadProjectionRepository } from '@book-library-tool/database'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { DomainWallet } from '@wallets/entities/DomainWallet.js'
import { WalletDocument } from '@wallets/persistence/mongo/documents/WalletDocument.js'
import { mapToDomain } from '@wallets/persistence/mongo/mappers/WalletDocCodec.js'
import { IWalletReadProjectionRepository } from '@wallets/repositories/IWalletReadProjectionRepository.js'
import { Collection, MongoError } from 'mongodb'

/**
 * MongoDB implementation of the wallet projection repository.
 * This repository is part of the CQRS pattern's read model, providing efficient
 * query access to wallet data and handling event-driven updates. It maintains
 * a denormalized view of wallet state optimized for read operations.
 */
export class WalletReadProjectionRepository
  extends BaseReadProjectionRepository<WalletDocument, DomainWallet>
  implements IWalletReadProjectionRepository
{
  /**
   * Constructs the WalletProjectionRepository with a database service.
   * Initializes the MongoDB collection and sets up error handling.
   *
   * @param dbService - The MongoDB database service instance
   * @throws {ApplicationError} If collection initialization fails
   */
  constructor(collection: Collection<WalletDocument>) {
    super(collection, mapToDomain)
  }

  /**
   * Retrieves a wallet by user ID from the projection store.
   * This method implements several optimizations:
   * - Field projection to minimize data transfer
   * - Soft delete filtering
   * - Comprehensive error handling
   *
   * @param userId - The ID of the user whose wallet to retrieve
   * @returns Promise resolving to the wallet DTO or null if not found
   * @throws {ApplicationError} If:
   *   - userId is invalid (400)
   *   - Collection is not initialized (500)
   *   - Database operation fails (500)
   */
  async getWalletByUserId(userId: string): Promise<DomainWallet | null> {
    if (!userId) {
      logger.error('Invalid userId provided to getWalletByUserId')

      throw new Errors.ApplicationError(
        400,
        ErrorCode.USER_NOT_FOUND,
        'User ID is required',
      )
    }

    try {
      if (!this.collection) {
        logger.error('Collection not initialized in getWalletByUserId')

        throw new Errors.ApplicationError(
          500,
          ErrorCode.DATABASE_ERROR,
          'Database collection not initialized',
        )
      }

      logger.debug(`Finding wallet for user: ${userId}`)

      const wallet = await this.collection.findOne(
        {
          userId,
          deletedAt: { $exists: false },
        },
        {
          // Optimize query performance with projection
          projection: {
            _id: 0,
            id: 1,
            userId: 1,
            balance: 1,
            version: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      )

      if (!wallet) {
        logger.info(`No wallet found for user: ${userId}`)

        return null
      }

      return wallet
    } catch (error) {
      const errorMessage = `Error retrieving wallet for user ${userId}: ${error.message}`

      logger.error(errorMessage)

      if (error instanceof MongoError) {
        throw new Errors.ApplicationError(
          500,
          ErrorCode.DATABASE_ERROR,
          errorMessage,
        )
      }

      throw error
    }
  }
}
