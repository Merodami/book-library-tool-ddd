import { BaseWriteProjectionRepository } from '@book-library-tool/database'
import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { DomainWallet } from '@wallets/domain/entities/DomainWallet.js'
import { mapToDomain } from '@wallets/persistence/mongo/mappers/WalletDocCodec.js'
import { IWalletWriteProjectionRepository } from '@wallets/repositories/IWalletWriteProjectionRepository.js'
import { Collection, MongoError } from 'mongodb'

/**
 * MongoDB implementation of the wallet projection repository.
 * This repository is part of the CQRS pattern's read model, providing efficient
 * query access to wallet data and handling event-driven updates. It maintains
 * a denormalized view of wallet state optimized for read operations.
 */
export class WalletWriteProjectionRepository
  extends BaseWriteProjectionRepository<DomainWallet, DomainWallet>
  implements IWalletWriteProjectionRepository
{
  /**
   * Constructs the WalletProjectionRepository with a database service.
   * Initializes the MongoDB collection and sets up error handling.
   *
   * @param dbService - The MongoDB database service instance
   * @throws {ApplicationError} If collection initialization fails
   */
  constructor(collection: Collection<DomainWallet>) {
    super(collection, mapToDomain)
  }

  /**
   * Saves a new wallet projection from a WalletCreated event.
   *
   * @param walletData - Data for the new wallet projection
   */
  async saveWallet(walletData: DomainWallet): Promise<void> {
    try {
      await this.collection.insertOne(walletData)

      logger.info(`Created wallet projection for wallet ${walletData.id}`)
    } catch (error) {
      const errorMessage = `Error saving wallet for wallet ${walletData.id}: ${error.message}`

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

  /**
   * Updates a wallet's balance based on various events that affect the balance.
   * This is a generic balance update method that can be used by different event handlers.
   *
   * @param id - The wallet ID
   * @param newBalance - The new balance amount
   * @param version - The new version number
   * @param timestamp - The timestamp of the update
   */
  async updateWalletBalance(
    id: string,
    newBalance: number,
    version: number,
    timestamp: Date,
  ): Promise<void> {
    try {
      await this.collection.updateOne(
        {
          id,
          version: { $lt: version },
        },
        {
          $set: {
            balance: newBalance,
            version,
            updatedAt: timestamp,
          },
        },
      )
    } catch (error) {
      const errorMessage = `Error updating wallet balance for wallet ${id}: ${error.message}`

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
