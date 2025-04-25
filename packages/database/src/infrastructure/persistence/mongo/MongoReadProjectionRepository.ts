import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { PaginatedResult } from '@book-library-tool/types'
import { MongoProjectionRepository } from '@database/infrastructure/index.js'
import { buildProjection, DocumentMapper } from '@database/shared/index.js'
import { Collection, Document, Filter } from 'mongodb'

/**
 * Base repository for MongoDB projection operations
 * Provides common CRUD functionality with projections support
 */
export abstract class MongoReadProjectionRepository<
  TDocument extends Document,
  TDto,
> extends MongoProjectionRepository<TDocument, TDto> {
  /**
   * Constructs a new base projection repository
   * @param collection - MongoDB collection
   * @param mapToDto - Function to map MongoDB documents to DTOs
   */
  constructor(
    protected readonly collection: Collection<TDocument>,
    protected readonly mapToDto: DocumentMapper<TDocument, TDto>,
  ) {
    super(collection, mapToDto)
  }

  /**
   * Find a single document by filter
   * @param filter - MongoDB filter
   * @param fields - Optional projection fields
   * @param errorContext - Context for error messages
   * @returns Mapped DTO or null if not found
   */
  async findOne(
    filter: Filter<TDocument>,
    fields?: string[] | unknown,
    errorContext?: string,
    includeDeleted?: boolean,
  ): Promise<TDto | null> {
    const completeFilter = this.buildCompleteFilter(filter, true)

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
  async findMany(
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
  async count(filter: Filter<TDocument>): Promise<number> {
    const completeFilter = this.buildCompleteFilter(filter)

    return this.collection.countDocuments(completeFilter)
  }

  /**
   * Executes a paginated query with comprehensive metadata
   * @param filter - MongoDB filter for the query
   * @param queryParams - Query parameters including pagination and sorting
   * @param fields - Optional fields to include in the projection
   * @returns Paginated result with data and metadata
   */
  async executePaginatedQuery<
    T extends {
      page?: number
      limit?: number
      skip?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    },
  >(
    filter: Filter<TDocument>,
    queryParams: T,
    fields?: string[] | unknown,
  ): Promise<PaginatedResult<TDto>> {
    // Apply deletion filter
    const completeFilter = this.buildCompleteFilter(filter)

    // Count total before pagination
    const total = await this.count(completeFilter)

    // Extract pagination parameters with defaults
    const limit = queryParams.limit || 10
    const page = queryParams.page || 1
    const skip =
      queryParams.skip !== undefined ? queryParams.skip : (page - 1) * limit

    // Calculate derived pagination values
    const pages = Math.ceil(total / limit)
    const currentPage =
      queryParams.skip !== undefined ? Math.floor(skip / limit) + 1 : page

    // Execute query with pagination, sorting and projection
    const data = await this.findMany(completeFilter, {
      skip,
      limit,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
      fields,
    })

    // Return paginated result
    return {
      data,
      pagination: {
        total,
        page: currentPage,
        limit,
        pages,
        hasNext: currentPage < pages,
        hasPrev: currentPage > 1,
      },
    }
  }
}
