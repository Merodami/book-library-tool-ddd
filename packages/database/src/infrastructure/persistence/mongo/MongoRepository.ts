import { PaginatedQuery, PaginatedResult } from '@book-library-tool/types'
import { MongoDatabaseService } from '@database/persistence/mongo/MongoDatabaseService.js'
import {
  IDatabaseService,
  QueryCriteria,
} from '@database/repositories/IDatabaseService.js'
import {
  Collection,
  Document,
  Filter,
  FindOptions,
  OptionalUnlessRequiredId,
  Sort,
  UpdateFilter,
} from 'mongodb'

/**
 * MongoRepository adapts the low‑level MongoDatabaseService to a generic repository interface.
 * It implements a database‑agnostic interface (IDatabaseService) for performing CRUD and pagination operations.
 *
 * Each instance is bound to a specific MongoDB collection and translates generic operations
 * to MongoDB‑specific commands while maintaining a domain‑focused API.
 *
 * @template T - The domain entity/document type.
 */
export class MongoRepository<T extends Document>
  implements IDatabaseService<T>
{
  private readonly collectionName: string
  private readonly dbService: MongoDatabaseService

  /**
   * Creates a new MongoRepository instance for a specified collection.
   *
   * @param collectionName - The name of the MongoDB collection.
   * @param dbService - (Optional) An existing instance of MongoDatabaseService.
   *                    If not provided, a new instance will be created.
   */
  constructor(collectionName: string, dbService: MongoDatabaseService) {
    this.collectionName = collectionName
    this.dbService = dbService
  }

  /**
   * Establishes a connection to the underlying MongoDB database.
   * Delegates connection management to the MongoDatabaseService.
   *
   * @returns A promise that resolves when the connection is successfully established.
   */
  async connect(): Promise<void> {
    await this.dbService.connect()
  }

  /**
   * Closes the connection to the underlying MongoDB database.
   * Delegates disconnection management to the MongoDatabaseService.
   *
   * @returns A promise that resolves when the disconnection is complete.
   */
  async disconnect(): Promise<void> {
    await this.dbService.disconnect()
  }

  /**
   * Retrieves a type‑safe MongoDB collection for the current entity type.
   *
   * @returns The MongoDB Collection instance.
   * @throws Error if the database connection has not been established.
   */
  private get collection(): Collection<T> {
    return this.dbService.getCollection<T>(this.collectionName)
  }

  /**
   * Finds a single document in the collection that matches the provided query criteria.
   *
   * @param criteria - Generic query criteria for filtering records.
   * @param options - Optional query options (e.g., projection).
   * @returns A promise that resolves to the found document or null if none match.
   */
  async findOne(
    criteria: QueryCriteria<T>,
    options?: FindOptions<T>,
  ): Promise<T | null> {
    return this.collection.findOne(criteria as Filter<T>, options)
  }

  /**
   * Counts the number of documents in the collection that match the provided criteria.
   *
   * @param criteria - Generic query criteria for filtering records.
   * @returns A promise that resolves to the count of matching documents.
   */
  async count(criteria: QueryCriteria<T>): Promise<number> {
    return this.collection.countDocuments(criteria as Filter<T>)
  }

  /**
   * Inserts a new document into the collection.
   * Automatically adds createdAt and updatedAt timestamps to the document.
   *
   * @param entity - The document to be inserted.
   * @returns A promise that resolves to the inserted document including timestamp fields.
   */
  async insert(entity: T): Promise<T> {
    const now = new Date().toISOString()
    const entityWithTimestamps = { ...entity, createdAt: now, updatedAt: now }

    // Cast to OptionalUnlessRequiredId<T> to satisfy MongoDB driver requirements.
    await this.collection.insertOne(
      entityWithTimestamps as unknown as OptionalUnlessRequiredId<T>,
    )

    // Return the entity without the MongoDB-specific _id field if desired.
    return entityWithTimestamps
  }

  /**
   * Updates a document in the collection based on the provided criteria.
   * Automatically merges in an updatedAt timestamp.
   *
   * @param criteria - Generic query criteria to identify the document to update.
   * @param update - A partial object containing the fields to be updated.
   * @returns A promise that resolves to the updated document.
   * @throws Error if no document is found after the update operation.
   */
  async update(criteria: QueryCriteria<T>, update: Partial<T>): Promise<T> {
    const now = new Date().toISOString()
    const updateData = { ...update, updatedAt: now }

    await this.collection.updateOne(
      criteria as Filter<T>,
      { $set: updateData } as UpdateFilter<T>,
    )

    const updated = await this.findOne(criteria)

    if (!updated) {
      throw new Error('Document not found after update')
    }

    return updated
  }

  /**
   * Paginates the collection based on the provided criteria and pagination parameters.
   *
   * @param criteria - Generic query criteria for filtering records.
   * @param pagination - Pagination parameters including page number and limit.
   * @param options - (Optional) Additional options such as projection and sort order.
   * @returns A promise that resolves to a paginated response containing the documents and pagination metadata.
   */
  async paginate(
    criteria: QueryCriteria<T>,
    pagination: PaginatedQuery,
    options?: {
      projection?: Partial<Record<keyof T, 1 | 0>>
      sort?: Partial<Record<keyof T, 1 | -1>>
    },
  ): Promise<PaginatedResult<T>> {
    const page = pagination.page ?? 1
    const limit =
      pagination.limit ?? parseInt(process.env.PAGINATION_DEFAULT_LIMIT ?? '10')
    const total = await this.count(criteria)
    const totalPages = Math.ceil(total / limit)

    const cursor = this.collection
      .find(criteria as Filter<T>, { projection: options?.projection })
      .sort((options?.sort as Sort) ?? {})
      .skip((page - 1) * limit)
      .limit(limit)

    const rawData = await cursor.toArray()

    // Remove MongoDB's _id field if not required by the domain.
    const data = rawData.map(({ _id, ...rest }) => rest as unknown as T)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }
}
