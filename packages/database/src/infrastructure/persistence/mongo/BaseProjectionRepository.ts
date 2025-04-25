import { Collection, Document, Filter } from 'mongodb'

/**
 * Generic document mapper function type
 */
export type DocumentMapper<TDocument, TDto> = (doc: Partial<TDocument>) => TDto

/**
 * Base repository for MongoDB projection operations
 * Provides common CRUD functionality with projections support
 */
export abstract class BaseProjectionRepository<
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
  protected buildCompleteFilter(filter: Filter<TDocument>): Filter<TDocument> {
    return {
      ...filter,
      ...this.getNotDeletedFilter(),
    }
  }
}
