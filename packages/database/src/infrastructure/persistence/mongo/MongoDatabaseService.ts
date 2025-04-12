import { logger } from '@book-library-tool/shared'
import { PaginatedQuery, PaginatedResult } from '@book-library-tool/types'
import { CacheService } from '@cache/mongo/CacheService.js'
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
  private cacheService: CacheService
  private metrics: MongoMetrics = {
    queryCount: 0,
    queryTime: 0,
    errorCount: 0,
    retryCount: 0,
  }

  /**
   * Constructor for MongoDatabaseService.
   * Initializes the MongoClient and Db instances to null.
   */
  constructor(dbName: string) {
    this.dbName = dbName
    this.cacheService = new CacheService()
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
   * Determines if an error is transient and can be retried.
   * @param error - The error to check
   * @returns true if the error is transient, false otherwise
   */
  private isTransientError(error: unknown): boolean {
    if (!(error instanceof MongoError)) {
      return false
    }

    // List of transient error codes that can be retried
    const transientErrorCodes = [
      6, // HostUnreachable
      7, // HostNotFound
      89, // NetworkTimeout
      91, // ShutdownInProgress
      189, // PrimarySteppedDown
      262, // ExceededTimeLimit
      9001, // SocketException
      10107, // NotMaster
      11600, // InterruptedAtShutdown
      11602, // InterruptedDueToReplStateChange
      13435, // NotMasterNoSlaveOk
      13436, // NotMasterOrSecondary
    ]

    const errorCode = (error as MongoError & { code?: number }).code
    return (
      (errorCode !== undefined && transientErrorCodes.includes(errorCode)) ||
      error.message.includes('network error') ||
      error.message.includes('connection reset') ||
      error.message.includes('socket exception')
    )
  }

  /**
   * Executes an operation with retry logic for transient failures.
   * @param operation - The operation to execute
   * @param maxRetries - Maximum number of retry attempts
   * @returns The result of the operation
   * @throws The last error if all retries fail
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error = new Error('No operation attempted')

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (this.isTransientError(error)) {
          this.metrics.retryCount++
          const delay = 1000 * Math.pow(2, i)
          logger.warn(
            `Retry attempt ${i + 1}/${maxRetries} after ${delay}ms: ${error.message}`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
    throw lastError
  }

  /**
   * Gets the current metrics for the database service.
   * @returns The current metrics
   */
  getMetrics(): MongoMetrics {
    return { ...this.metrics }
  }

  /**
   * Resets the metrics counters.
   */
  resetMetrics(): void {
    this.metrics = {
      queryCount: 0,
      queryTime: 0,
      errorCount: 0,
      retryCount: 0,
    }
  }

  /**
   * Invalidates cache entries for a specific collection
   */
  invalidateCache(collectionName: string): void {
    this.cacheService.invalidateCollection(collectionName)
  }

  /**
   * Clears the entire cache
   */
  clearCache(): void {
    this.cacheService.clear()
  }

  /**
   * Generic pagination method for any collection with retry logic and caching
   */
  async paginateCollection<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
    pagination: PaginatedQuery,
    options?: {
      projection?: Record<string, number>
      sort?: Record<string, 1 | -1>
      cacheTtl?: number
    },
  ): Promise<PaginatedResult<WithId<T>>> {
    const startTime = Date.now()
    const collectionName = collection.collectionName
    const cacheKey = this.cacheService.generateCacheKey(
      collectionName,
      query as Record<string, unknown>,
    )

    // Try to get from cache first if cacheTtl is specified
    if (options?.cacheTtl) {
      const cached = this.cacheService.get<PaginatedResult<WithId<T>>>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      const { page: possiblePage, limit: possibleLimit } = pagination

      const limit = possibleLimit
        ? Math.floor(Number(possibleLimit))
        : Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10

      const page = possiblePage ? Math.floor(Number(possiblePage)) : 1

      const totalItems = await this.withRetry(() =>
        collection.countDocuments(query),
      )

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

      const rawData = await this.withRetry(() => cursor.toArray())
      const data = rawData.map(({ _id, ...rest }) => rest as WithId<T>)

      const result = {
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

      // Cache the result if cacheTtl is specified
      if (options?.cacheTtl) {
        this.cacheService.set(cacheKey, result, options.cacheTtl)
      }

      this.metrics.queryCount++
      this.metrics.queryTime += Date.now() - startTime

      return result
    } catch (error) {
      this.metrics.errorCount++
      this.metrics.queryTime += Date.now() - startTime
      throw error
    }
  }
}
