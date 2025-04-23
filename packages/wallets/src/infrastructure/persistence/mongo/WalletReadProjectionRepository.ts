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
  async getWallet({
    id,
    userId,
  }: {
    id?: string
    userId?: string
  }): Promise<DomainWallet | null> {
    // Validate that at least one parameter is provided
    if (!id && !userId) {
      logger.error(
        'Invalid parameters provided to getWallet - either id or userId is required',
      )

      throw new Errors.ApplicationError(
        400,
        ErrorCode.WALLET_NOT_FOUND,
        'Either wallet ID or user ID is required',
      )
    }

    try {
      if (!this.collection) {
        logger.error('Collection not initialized in getWallet')

        throw new Errors.ApplicationError(
          500,
          ErrorCode.DATABASE_ERROR,
          'Database collection not initialized',
        )
      }

      // Build the query based on which parameter is provided
      const query: Record<string, any> = {
        deletedAt: { $exists: false },
      }

      if (id) {
        query.id = id
        logger.debug(`Finding wallet for id: ${id}`)
      } else if (userId) {
        query.userId = userId
        logger.debug(`Finding wallet for userId: ${userId}`)
      }

      const wallet = await this.collection.findOne(query, {
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
      })

      if (!wallet) {
        if (id) {
          logger.info(`No wallet found for id: ${id}`)
        } else if (userId) {
          logger.info(`No wallet found for userId: ${userId}`)
        }

        return null
      }

      return wallet
    } catch (error) {
      const paramType = id ? `id ${id}` : `userId ${userId}`
      const errorMessage = `Error retrieving wallet for ${paramType}: ${error.message}`

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
