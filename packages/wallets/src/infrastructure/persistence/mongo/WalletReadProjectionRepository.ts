import { WalletSortField } from '@book-library-tool/api/src/schemas/wallets.js'
import { MongoReadProjectionRepository } from '@book-library-tool/database'
import { GetWalletQuery } from '@wallets/application/use_cases/queries/GetWalletQuery.js'
import { DomainWallet } from '@wallets/domain/entities/DomainWallet.js'
import { WalletReadProjectionRepositoryPort } from '@wallets/domain/port/WalletReadProjectionRepositoryPort.js'
import { WalletDocument } from '@wallets/infrastructure/persistence/mongo/documents/WalletDocument.js'
import { mapToDomain } from '@wallets/infrastructure/persistence/mongo/mappers/WalletDocCodec.js'
import { Collection, Filter } from 'mongodb'

/**
 * MongoDB implementation of the wallet projection repository.
 * This repository is part of the CQRS pattern's read model, providing efficient
 * query access to wallet data and handling event-driven updates. It maintains
 * a denormalized view of wallet state optimized for read operations.
 */
export class WalletReadProjectionRepository
  extends MongoReadProjectionRepository<WalletDocument, DomainWallet>
  implements WalletReadProjectionRepositoryPort
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
  async getWallet(
    query: GetWalletQuery,
    fields?: WalletSortField[],
  ): Promise<DomainWallet | null> {
    return this.findOne(
      { id: query.id } as Filter<WalletDocument>,
      fields,
      `wallet doc for ID ${query.id}`,
    )
  }
}
