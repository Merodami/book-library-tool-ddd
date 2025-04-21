import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { pick } from 'lodash-es'
import {
  Collection,
  Document,
  Filter,
  ObjectId,
  OptionalUnlessRequiredId,
} from 'mongodb'

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

  /**
   * Generic method to save a projection document
   * @param dtoData - DTO to save
   * @param mapToDocument - Function to map DTO to document
   */
  protected async saveProjection(
    dtoData: TDto,
    mapToDocument: (dto: TDto) => Omit<TDocument, '_id'>,
  ): Promise<void> {
    const doc = mapToDocument(dtoData)

    await this.collection.insertOne({
      ...doc,
      _id: new ObjectId(),
    } as OptionalUnlessRequiredId<TDocument>)
  }

  /**
   * Generic method to update specific fields of a projection
   * @param id - Document ID
   * @param changes - Partial changes to apply
   * @param allowedFields - Array of field names that are allowed to be updated
   * @param updatedAt - Update timestamp
   * @param errorCode - Error code to use if document not found
   * @param errorMessage - Error message to use if document not found
   */
  protected async updateProjection<T extends TDto>(
    id: string,
    changes: Partial<T>,
    allowedFields: Array<keyof T>,
    updatedAt: Date | string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    const picked = pick(changes, allowedFields)

    // Create an object that will be compatible with MongoDB's typing
    const setFields: Partial<Record<string, unknown>> = {
      ...picked,
      updatedAt: updatedAt instanceof Date ? updatedAt : new Date(updatedAt),
    }

    if (Object.keys(setFields).length === 0) {
      return
    }

    // Create a filter object and use a type predicate to ensure it's properly typed
    const idFilter: Record<string, unknown> = { id }
    const filter = this.buildCompleteFilter(idFilter as Filter<TDocument>)

    const result = await this.collection.updateOne(filter, {
      $set: setFields as Partial<TDocument>,
    })

    if (result.matchedCount === 0) {
      throw new Errors.ApplicationError(404, errorCode, errorMessage)
    }
  }
}
