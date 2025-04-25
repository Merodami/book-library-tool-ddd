import { PaginatedResult } from '@book-library-tool/types'
import { IBaseProjectionRepository } from '@database/domain/index.js'
import { Document, Filter } from 'mongodb'

/**
 * Interface for read-only MongoDB projection repositories
 * Provides methods for querying and retrieving documents with projection support
 *
 * @template TDocument The MongoDB document type
 * @template TDto The data transfer object type
 */
export interface IBaseReadProjectionRepository<TDocument extends Document, TDto>
  extends IBaseProjectionRepository<TDocument, TDto> {
  /**
   * Find a single document by filter
   *
   * @param filter - MongoDB filter
   * @param fields - Optional projection fields (string array or comma-separated string)
   * @param errorContext - Context for error messages
   * @returns Promise resolving to mapped DTO or null if not found
   * @throws ApplicationError with code INTERNAL_ERROR if mapping fails
   */
  findOne(
    filter: Filter<TDocument>,
    fields?: string[] | unknown,
    errorContext?: string,
  ): Promise<TDto | null>

  /**
   * Find multiple documents with pagination
   *
   * @param filter - MongoDB filter
   * @param options - Query options (pagination, sorting, projection)
   * @returns Promise resolving to array of mapped DTOs
   */
  findMany(
    filter: Filter<TDocument>,
    options: {
      skip?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      fields?: string[] | unknown
    },
  ): Promise<TDto[]>

  /**
   * Count documents matching a filter
   *
   * @param filter - MongoDB filter
   * @returns Promise resolving to count of matching documents
   */
  count(filter: Filter<TDocument>): Promise<number>

  /**
   * Executes a paginated query with comprehensive metadata
   *
   * @param filter - MongoDB filter for the query
   * @param queryParams - Query parameters including pagination and sorting
   * @param fields - Optional fields to include in the projection
   * @returns Promise resolving to paginated result with data and metadata
   */
  executePaginatedQuery<
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
  ): Promise<PaginatedResult<TDto>>
}
