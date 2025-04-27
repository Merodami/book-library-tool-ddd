import { PaginatedQuery, PaginatedResult } from '@book-library-tool/types'
import { Collection, Db, Document, Filter, WithId } from 'mongodb'

/**
 * Tracks counts and timings for MongoDB operations.
 */
export interface MongoMetrics {
  /** Total number of queries executed */
  queryCount: number
  /** Cumulative time spent in queries (ms) */
  queryTime: number
  /** Total number of errors encountered */
  errorCount: number
  /** Total number of retry attempts made */
  retryCount: number
}

/**
 * Defines the contract for a low-level MongoDB service.
 *
 * @template T            Document shape stored in the collection.
 * @template InsertResult Return type for insert operations (defaults to T).
 * @template UpdateResult Return type for update operations (defaults to T).
 */
export interface MongoDatabaseServicePort<T extends Document = Document> {
  /**
   * Establishes (or reuses) the MongoDB connection.
   *
   * @throws Error if required configuration (e.g. URI) is missing.
   */
  connect(): Promise<void>

  /**
   * Closes the active MongoDB connection, if any.
   */
  disconnect(): Promise<void>

  /**
   * Retrieves the native `Db` instance.
   *
   * @returns The connected database.
   * @throws Error if not yet connected.
   */
  getDb(): Db

  /**
   * Returns a typed `Collection<T>` by name.
   *
   * @param name – Collection name.
   * @returns A MongoDB Collection for documents of type T.
   * @throws Error if not yet connected.
   */
  getCollection(name: string): Collection<T>

  /**
   * Executes a paginated query with built-in retry logic and metrics.
   *
   * @param collection – The target collection.
   * @param filter     – MongoDB filter criteria.
   * @param pagination – Page & limit parameters.
   * @param options    – Optional projection & sort settings.
   * @returns A paginated result set including metadata.
   */
  paginate(
    collection: Collection<T>,
    filter: Filter<T>,
    pagination: PaginatedQuery,
    options?: {
      projection?: Record<string, number>
      sort?: Record<string, 1 | -1>
    },
  ): Promise<PaginatedResult<WithId<T>>>

  /**
   * Performs a health check by pinging the server.
   *
   * @returns Status ("UP" or "DOWN") and details or error message.
   */
  checkHealth(): Promise<{ status: 'UP' | 'DOWN'; details: unknown }>

  /**
   * Retrieves the current set of collected metrics.
   */
  getMetrics(): MongoMetrics

  /**
   * Resets all metrics counters back to zero.
   */
  resetMetrics(): void
}
