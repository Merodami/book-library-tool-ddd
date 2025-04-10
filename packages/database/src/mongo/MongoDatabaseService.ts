import { logger } from '@book-library-tool/shared'
import { PaginatedQuery, PaginatedResult } from '@book-library-tool/types'
import {
  Collection,
  Db,
  Document,
  Filter,
  MongoClient,
  MongoClientOptions,
  WithId,
} from 'mongodb'

/**
 * MongoDatabaseService encapsulates low‑level MongoDB connection management.
 *
 * This service is responsible for:
 * - Establishing a connection to the MongoDB instance.
 * - Managing the connection lifecycle.
 * - Exposing type‑safe collections for higher‑level adapters.
 *
 * The higher‑level repository (e.g. MongoRepository) uses this service to obtain
 * a specific collection and perform CRUD operations in a database‑agnostic way.
 */
export class MongoDatabaseService {
  private client: MongoClient | null = null
  private db: Db | null = null
  private dbName: string

  /**
   * Constructor for MongoDatabaseService.
   * Initializes the MongoClient and Db instances to null.
   */
  constructor(dbName: string) {
    this.dbName = dbName
  }

  /**
   * Connects to MongoDB using the MONGO_URI and MONGO_DB_NAME_LIBRARY environment variables.
   * If a connection is already established, it reuses the existing connection.
   *
   * @returns A promise that resolves when the connection is successfully established.
   * @throws An error if the MONGO_URI is not defined.
   */
  async connect(): Promise<void> {
    if (this.db) {
      return
    }

    const uri = process.env.MONGO_URI

    if (!uri) {
      throw new Error('MONGO_URI is not defined in the environment variables')
    }

    // Define client options (defaults are typically sufficient).
    const options: MongoClientOptions = {}

    this.client = new MongoClient(uri, options)
    await this.client.connect()

    this.db = this.client.db(
      this.dbName || process.env.MONGO_DB_NAME_LIBRARY || 'library',
    )

    logger.info(`Connected to MongoDB database: ${this.dbName}`)
  }

  /**
   * Retrieves the connected MongoDB database instance.
   *
   * @returns The MongoDB Db instance.
   * @throws An error if the database connection has not been established.
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    return this.db
  }

  /**
   * Retrieves a type‑safe collection from the connected MongoDB database.
   *
   * @param name - The name of the MongoDB collection.
   * @returns The MongoDB Collection instance.
   * @throws An error if the database connection has not been established.
   */
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    return this.db.collection<T>(name)
  }

  /**
   * Disconnects from the MongoDB database.
   *
   * @returns A promise that resolves when the connection is closed.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
      logger.info('Disconnected from MongoDB')
    }
  }

  /**
   * Generic pagination method for any collection
   */
  async paginateCollection<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
    pagination: PaginatedQuery,
    options?: {
      projection?: Record<string, number>
      sort?: Record<string, 1 | -1>
    },
  ): Promise<PaginatedResult<WithId<T>>> {
    const { page: possiblePage, limit: possibleLimit } = pagination

    // Fixed: Ensure limit is properly converted to a number and has proper fallback
    const limit = possibleLimit
      ? Math.floor(Number(possibleLimit))
      : Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10

    // Fixed: Use possiblePage instead of possibleLimit for page calculation
    const page = possiblePage ? Math.floor(Number(possiblePage)) : 1

    const totalItems = await collection.countDocuments(query)

    const totalPages = Math.ceil(totalItems / limit)

    const cursor = collection
      .find(query, {
        projection: {
          _id: 0,
          createdAt: 0,
          updatedAt: 0,
          ...options?.projection,
        },
      })
      .sort(options?.sort || {})
      .skip((page - 1) * limit)
      .limit(limit)

    const rawData = await cursor.toArray()
    const data = rawData.map(({ _id, ...rest }) => rest as WithId<T>)

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalItems,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }
}
