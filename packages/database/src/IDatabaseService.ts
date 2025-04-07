import { PaginatedResponse, PaginationParams } from '@book-library-tool/types'

/**
 * A generic type representing query criteria for filtering records.
 * You can extend this type or use more specific ones if needed.
 */
export type QueryCriteria<T> = Partial<Record<keyof T, any>>

/**
 * A production-ready generic database service interface.
 *
 * @template T - The domain entity type.
 * @template InsertResult - The type returned on insert operations (defaults to T).
 * @template UpdateResult - The type returned on update operations (defaults to T).
 */
export interface IDatabaseService<T, InsertResult = T, UpdateResult = T> {
  /**
   * Establishes a connection to the database.
   * Implementations can initialize connection pools or ORM clients here.
   */
  connect(): Promise<void>

  /**
   * Closes the connection to the database.
   */
  disconnect(): Promise<void>

  /**
   * Retrieves a single record that matches the given criteria.
   *
   * @param criteria - The filter criteria to find the record.
   * @param options - Optional engine-specific options (e.g., projection for NoSQL).
   * @returns The found record or null if no match exists.
   */
  findOne(criteria: QueryCriteria<T>, options?: any): Promise<T | null>

  /**
   * Counts the records matching the given criteria.
   *
   * @param criteria - The filter criteria.
   * @returns The count of matching records.
   */
  count(criteria: QueryCriteria<T>): Promise<number>

  /**
   * Inserts a new record into the database.
   *
   * @param entity - The entity to insert.
   * @returns The inserted record or an insert result object.
   */
  insert(entity: T): Promise<InsertResult>

  /**
   * Updates record(s) matching the given criteria.
   *
   * @param criteria - The filter criteria to select records.
   * @param update - The partial entity containing updated fields.
   * @returns The updated record(s) or an update result object.
   */
  update(criteria: QueryCriteria<T>, update: Partial<T>): Promise<UpdateResult>

  /**
   * Retrieves records in a paginated format.
   *
   * @param criteria - The filter criteria for the query.
   * @param pagination - Pagination parameters (e.g., page, limit).
   * @param options - Additional options such as sort or projection.
   * @returns A paginated response containing the records.
   */
  paginate(
    criteria: QueryCriteria<T>,
    pagination: PaginationParams,
    options?: {
      projection?: Partial<Record<keyof T, 1 | 0>>
      sort?: Partial<Record<keyof T, 1 | -1>>
    },
  ): Promise<PaginatedResponse<T>>
}
