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
   * Connects to the database.
   */
  connect(): Promise<Db>

  /**
   * Returns a type‑safe collection from the connected database.
   * @param name - The name of the collection.
   */
  getCollection<T extends Document = Document>(name: string): Collection<T>

  /**
   * Finds a single document in a given collection based on the provided query.
   */
  findOne<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
    options?: FindOptions<T>,
  ): Promise<WithId<T> | null>

  /**
   * Counts the documents in a collection based on the provided query.
   */
  countDocuments<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
  ): Promise<number>

  /**
   * Inserts a document into a collection with createdAt and updatedAt timestamps.
   */
  insertDocument<T extends Document>(
    collection: Collection<T>,
    document: T,
  ): Promise<InsertOneResult<T & { createdAt?: string; updatedAt?: string }>>

  /**
   * Updates a document in a collection by merging the provided update data with an automatically added updatedAt timestamp.
   */
  updateDocument<T extends Document>(
    collection: Collection<T>,
    filter: Filter<T>,
    update: UpdateFilter<T> | Partial<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult>

  /**
   * Paginates a collection based on the provided query and pagination parameters.
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
