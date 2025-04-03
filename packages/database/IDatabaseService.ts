import {
  Db,
  Collection,
  Document,
  WithId,
  Filter,
  FindOptions,
  InsertOneResult,
  UpdateResult,
  UpdateFilter,
  UpdateOptions,
} from 'mongodb'
import { PaginatedResponse, PaginationParams } from '@book-library-tool/types'

export interface IDatabaseService {
  /**
   * Connects to the database and initializes the underlying Db instance.
   */
  connect(): Promise<Db>

  /**
   * Returns a type‑safe collection from the connected database.
   * @param name - The name of the collection.
   */
  getCollection<T extends Document = Document>(name: string): Collection<T>

  /**
   * Finds a document in a given collection based on the provided query.
   * @param collection - The collection to search in.
   * @param query - The filter query.
   * @param options - Optional find options.
   * @returns A document with its _id, or null if not found.
   */
  findOne<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
    options?: FindOptions<T>,
  ): Promise<WithId<T> | null>

  /**
   * Counts the documents in a collection based on the provided query.
   * @param collection - The collection to count documents in.
   * @param query - The filter query.
   */
  countDocuments<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
  ): Promise<number>

  /**
   * Inserts a document into a collection, automatically adding createdAt and updatedAt timestamps.
   * @param collection - The collection to insert the document into.
   * @param document - The document to insert.
   * @returns The result of the insertion.
   */
  insertDocument<T extends Document>(
    collection: Collection<T>,
    document: T,
  ): Promise<InsertOneResult<T & { createdAt?: string; updatedAt?: string }>>

  /**
   * Updates a document in a collection by merging the provided update data with an automatically added updatedAt timestamp.
   * @param collection - The collection containing the document.
   * @param filter - The filter to identify the document.
   * @param update - The update operations or partial document.
   * @param options - Optional update options.
   * @returns The result of the update operation.
   */
  updateDocument<T extends Document>(
    collection: Collection<T>,
    filter: Filter<T>,
    update: UpdateFilter<T> | Partial<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult>

  /**
   * Paginates the results of a collection query.
   * @param collection - The collection to query.
   * @param query - The filter query.
   * @param pagination - Pagination parameters.
   * @param options - Optional projection and sort options.
   * @returns A paginated response containing data and pagination info.
   */
  paginateCollection<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
    pagination: PaginationParams,
    options?: {
      projection?: Record<string, number>
      sort?: Record<string, 1 | -1>
    },
  ): Promise<PaginatedResponse<WithId<T>>>

  /**
   * Disconnects from the database.
   */
  disconnect(): Promise<void>
}
