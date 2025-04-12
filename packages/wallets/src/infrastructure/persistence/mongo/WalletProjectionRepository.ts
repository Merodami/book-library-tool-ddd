import { WalletDTO } from '@book-library-tool/api/src/schemas/wallets.js'
import { MongoDatabaseService } from '@book-library-tool/database'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { IWalletProjectionRepository } from '@repositories/IWalletProjectionRepository.js'
import { Collection, MongoError } from 'mongodb'

const WALLET_PROJECTION_TABLE = 'wallet_projection'

/**
 * MongoDB implementation of the wallet projection repository for read operations.
 * This repository is part of the CQRS pattern's read model, providing efficient
 * query access to wallet data. It maintains a denormalized view of wallet state
 * optimized for read operations.
 *
 * The repository implements the IWalletProjectionRepository interface and is
 * responsible for:
 * - Retrieving wallet information by user ID
 * - Optimizing query performance through field projection
 * - Handling database errors and providing appropriate error responses
 * - Maintaining data consistency through soft delete patterns
 */
export class WalletProjectionRepository implements IWalletProjectionRepository {
  private readonly collection: Collection<WalletDTO>

  /**
   * Constructs the WalletProjectionRepository with a database service.
   * Initializes the MongoDB collection and sets up error handling.
   *
   * @param dbService - The MongoDB database service instance
   * @throws {ApplicationError} If collection initialization fails
   */
  constructor(private readonly dbService: MongoDatabaseService) {
    try {
      this.collection = dbService.getCollection<WalletDTO>(
        WALLET_PROJECTION_TABLE,
      )

      logger.info(
        `Initialized wallet projection repository with collection: ${WALLET_PROJECTION_TABLE}`,
      )
    } catch (error) {
      logger.error(
        `Failed to initialize wallet projection repository: ${error}`,
      )

      throw new Errors.ApplicationError(
        500,
        ErrorCode.DATABASE_ERROR,
        `Failed to initialize wallet projection repository: ${error.message}`,
      )
    }
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
  async getWalletByUserId(userId: string): Promise<WalletDTO | null> {
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
