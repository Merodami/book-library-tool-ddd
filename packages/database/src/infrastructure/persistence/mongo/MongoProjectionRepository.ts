import { DocumentMapper } from '@database/shared/index.js'
import { Collection, Document, Filter } from 'mongodb'

/**
 * Base repository for MongoDB projection operations
 * Provides common CRUD functionality with projections support
 */
export abstract class MongoProjectionRepository<
  TDocument extends Document,
  TDto,
> {
  /**
   * Constructs a new base projection repository
   * @param collection - MongoDB collection
   * @param mapToDto - Function to map MongoDB documents to DTOs
   */
  constructor(
    protected readonly collection: Collection<TDocument>,
    protected readonly mapToDto: DocumentMapper<TDocument, TDto>,
  ) {}

  /**
   * Build a soft deletion filter
   * @returns MongoDB filter to exclude soft-deleted records
   */
  protected getNotDeletedFilter(): Filter<TDocument> {
    return {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    } as Filter<TDocument>
  }

  /**
   * Combines entity filter with soft deletion filter
   * @param filter - Entity-specific filter
   * @returns Combined filter
   */
  protected buildCompleteFilter(
    filter: Filter<TDocument>,
    includeDeleted?: boolean,
  ): Filter<TDocument> {
    return {
      ...(includeDeleted ? {} : this.getNotDeletedFilter()),
      ...filter,
    }
  }
}
