import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { Collection, Document, Filter } from 'mongodb'

import { buildProjection } from './projectionUtils.js'

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

  /**
   * Find a single document by filter
   * @param filter - MongoDB filter
   * @param fields - Optional projection fields
   * @param errorContext - Context for error messages
   * @returns Mapped DTO or null if not found
   */
  protected async findOne(
    filter: Filter<TDocument>,
    fields?: string[] | unknown,
    errorContext?: string,
  ): Promise<TDto | null> {
    const completeFilter = this.buildCompleteFilter(filter)

    // Handle string array or potentially string with comma separated values
    const projectionFields = Array.isArray(fields)
      ? fields
      : typeof fields === 'string'
        ? fields.split(',')
        : undefined

    const doc = await this.collection.findOne(completeFilter, {
      projection: buildProjection(projectionFields),
    })

    if (!doc) return null

    try {
      return this.mapToDto(doc as Partial<TDocument>)
    } catch (err) {
      const context = errorContext || 'document'

      logger.error(`Invalid ${context}:`, err)

      throw new Errors.ApplicationError(
        500,
        ErrorCode.INTERNAL_ERROR,
        `Invalid ${context} data`,
      )
    }
  }

  /**
   * Find multiple documents with pagination
   * @param filter - MongoDB filter
   * @param options - Query options (pagination, sorting, projection)
   * @returns Array of mapped DTOs
   */
  protected async findMany(
    filter: Filter<TDocument>,
    options: {
      skip?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      fields?: string[] | unknown
    },
  ): Promise<TDto[]> {
    const completeFilter = this.buildCompleteFilter(filter)
    const { skip = 0, limit = 10, sortBy, sortOrder, fields } = options

    // Handle string array or potentially string with comma separated values
    const projectionFields = Array.isArray(fields)
      ? fields
      : typeof fields === 'string'
        ? fields.split(',')
        : undefined

    let cursor = this.collection
      .find(completeFilter)
      .project(buildProjection(projectionFields))
      .skip(skip)
      .limit(limit)

    if (sortBy) {
      cursor = cursor.sort({
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
      })
    }

    const docs = await cursor.toArray()

    return docs.map((doc) => this.mapToDto(doc as Partial<TDocument>))
  }

  /**
   * Count documents matching a filter
   * @param filter - MongoDB filter
   * @returns Count of matching documents
   */
  protected async count(filter: Filter<TDocument>): Promise<number> {
    const completeFilter = this.buildCompleteFilter(filter)

    return this.collection.countDocuments(completeFilter)
  }
}
