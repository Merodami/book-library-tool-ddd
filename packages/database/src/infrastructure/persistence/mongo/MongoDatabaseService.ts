import { logger } from '@book-library-tool/shared'
import { PaginatedQuery, PaginatedResult } from '@book-library-tool/types'
import {
  Collection,
  Db,
  Document,
  Filter,
  MongoClient,
  MongoClientOptions,
  MongoError,
  WithId,
} from 'mongodb'

interface MongoMetrics {
  queryCount: number
  queryTime: number
  errorCount: number
  retryCount: number
}

/**
 * MongoDatabaseService encapsulates low‑level MongoDB connection management.
 *
 * This service is responsible for:
 * - Establishing a connection to the MongoDB instance.
 * - Managing the connection lifecycle.
 * - Exposing type‑safe collections for higher‑level adapters.
 * - Implementing retry logic for transient failures.
 * - Tracking performance metrics.
 *
 * The higher‑level repository (e.g. MongoRepository) uses this service to obtain
 * a specific collection and perform CRUD operations in a database‑agnostic way.
 */
export class MongoDatabaseService {
  private client: MongoClient | null = null
  private db: Db | null = null
  private dbName: string
  private metrics: MongoMetrics = {
    queryCount: 0,
    queryTime: 0,
    errorCount: 0,
    retryCount: 0,
  }

  /**
   * Constructor for MongoDatabaseService.
   * Initializes the service with the given database name.
   * Sets up a shutdown hook to close the connection.
   */
  constructor(dbName: string) {
    this.dbName = dbName

    process.on('SIGTERM', async () => {
      await this.disconnect()
    })
  }

  /**
   * Connects to MongoDB using the MONGO_URI and optional DB name.
   * Reuses existing connection if already connected.
   * @throws if MONGO_URI is undefined
   */
  async connect(): Promise<void> {
    if (this.db) return

    const uri = process.env.MONGO_URI

    if (!uri) throw new Error('MONGO_URI is not defined')

    const options: MongoClientOptions = {
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority' },
    }

    this.client = new MongoClient(uri, options)
    await this.client.connect()

    this.db = this.client.db(
      this.dbName || process.env.MONGO_DB_NAME_LIBRARY || 'library',
    )

    logger.info(`Connected to MongoDB database: ${this.dbName}`)
  }

  /**
   * Retrieves the connected MongoDB Db instance.
   * @throws if not connected
   */
  getDb(): Db {
    if (!this.db)
      throw new Error('Database not connected. Call connect() first.')

    return this.db
  }

  /**
   * Retrieves a type‑safe collection from MongoDB.
   * @throws if not connected
   */
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db)
      throw new Error('Database not connected. Call connect() first.')

    return this.db.collection<T>(name)
  }

  /**
   * Disconnects from MongoDB.
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
   * Determines if an error is transient and can be retried.
   * @param error - error to inspect
   */
  private isTransientError(error: unknown): boolean {
    if (!(error instanceof MongoError)) return false

    const transientErrorCodes = [
      6, 7, 89, 91, 189, 262, 9001, 10107, 11600, 11602, 13435, 13436,
    ]
    const code = (error as MongoError & { code?: number }).code

    return (
      (code !== undefined && transientErrorCodes.includes(code)) ||
      (error instanceof Error &&
        /network error|connection reset|socket exception/i.test(error.message))
    )
  }

  /**
   * Executes an operation with retry logic for transient failures.
   * @param operation fn returning a promise
   * @param maxRetries max attempts
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error = new Error('No operation attempted')

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (this.isTransientError(error)) {
          this.metrics.retryCount++

          const delay = 1000 * 2 ** (attempt - 1)

          logger.warn(
            `Retry ${attempt}/${maxRetries} in ${delay}ms: ${lastError.message}`,
          )

          await new Promise((res) => setTimeout(res, delay))

          continue
        }

        throw lastError
      }
    }

    throw lastError
  }

  /**
   * Generic pagination for any collection with retry logic.
   * @param collection - Mongo collection
   * @param query - filter
   * @param pagination - page & limit
   * @param options - projection and sort
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
    const start = Date.now()

    const limit = pagination.limit
      ? Math.max(1, Math.floor(pagination.limit))
      : parseInt(process.env.PAGINATION_DEFAULT_LIMIT ?? '10', 10)

    const page = pagination.page ? Math.max(1, Math.floor(pagination.page)) : 1

    const total = await this.withRetry(() => collection.countDocuments(query))

    const pages = Math.ceil(total / limit)

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

    const docs = await this.withRetry(() => cursor.toArray())

    const data = docs.map(({ _id, ...rest }) => rest as WithId<T>)

    this.metrics.queryCount++
    this.metrics.queryTime += Date.now() - start

    return {
      data,
      pagination: {
        total,
        pages,
        page,
        limit,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Checks the health of the MongoDB connection.
   * @returns status and details
   */
  async checkHealth(): Promise<{ status: string; details: any }> {
    if (!this.client || !this.db) {
      return { status: 'DOWN', details: { reason: 'Not connected' } }
    }

    try {
      await this.db.admin().ping()

      return {
        status: 'UP',
        details: { dbName: this.dbName, metrics: { ...this.metrics } },
      }
    } catch (error) {
      return {
        status: 'DOWN',
        details: {
          reason: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Returns current metrics.
   */
  getMetrics(): MongoMetrics {
    return { ...this.metrics }
  }

  /**
   * Resets metrics counters to zero.
   */
  resetMetrics(): void {
    this.metrics = { queryCount: 0, queryTime: 0, errorCount: 0, retryCount: 0 }
  }
}
