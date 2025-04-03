import { PaginatedResponse, PaginationParams } from '@book-library-tool/types'
import {
  MongoClient,
  Db,
  Collection,
  MongoClientOptions,
  Document,
  WithId,
  Filter,
  FindOptions,
  InsertOneResult,
  OptionalUnlessRequiredId,
  UpdateResult,
  UpdateFilter,
  UpdateOptions,
} from 'mongodb'

// Generic interface for documents with timestamp fields.
interface Timestamped {
  createdAt?: string
  updatedAt?: string
}

export class DatabaseService {
  private static client: MongoClient | null = null
  private static db: Db | null = null

  /**
   * Connect to MongoDB using the provided MONGO_URI and MONGO_DB_NAME environment variables.
   * Returns the connected database instance.
   */
  static async connect(): Promise<Db> {
    if (this.db) {
      return this.db
    }

    const uri = process.env.MONGO_URI

    if (!uri) {
      throw new Error('MONGO_URI is not defined in the environment variables')
    }

    // Options object can be empty as these options are now defaults
    const options: MongoClientOptions = {}

    this.client = new MongoClient(uri, options)

    await this.client.connect()

    const dbName = process.env.MONGO_DB_NAME || 'books-dev'

    this.db = this.client.db(dbName)

    console.log(`Connected to MongoDB database: ${dbName}`)

    return this.db
  }

  /**
   * Returns a type-safe collection from the connected database.
   */
  static getCollection<T extends Document = Document>(
    name: string,
  ): Collection<T> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.db.collection<T>(name)
  }

  /**
   * Find a document in any collection based on the provided query.
   */
  static async findOne<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
    options?: FindOptions<T>,
  ): Promise<WithId<T> | null> {
    return collection.findOne(
      query,
      options || {
        projection: {
          _id: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    )
  }

  /**
   * Count documents in a collection based on the provided query.
   * Used in the reservationHandler to count active reservations.
   */
  static async countDocuments<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
  ): Promise<number> {
    return collection.countDocuments(query)
  }

  /**
   * Insert a document into a collection with createdAt and updatedAt timestamps.
   */
  static async insertDocument<T extends Document>(
    collection: Collection<T>,
    document: T,
  ): Promise<InsertOneResult<T & Timestamped>> {
    const now = new Date().toISOString()

    const docWithTimestamps = {
      ...document,
      createdAt: now,
      updatedAt: now,
    } as T & Timestamped

    return collection.insertOne(
      docWithTimestamps as unknown as OptionalUnlessRequiredId<T>,
    )
  }

  /**
   * Update a document in a collection by merging the provided update filter with an automatically
   * added 'updatedAt' timestamp. Supports update operators such as $inc, $set, etc.
   */
  static async updateDocument<T extends Document>(
    collection: Collection<T>,
    filter: Filter<T>,
    update: UpdateFilter<T> | Partial<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    const now = new Date().toISOString()

    let updateFilter: UpdateFilter<T>

    // Check if the update object already contains an atomic operator
    if (Object.keys(update).some((key) => key.startsWith('$'))) {
      // It's an atomic update; use it as is and merge in updatedAt
      updateFilter = { ...update } as UpdateFilter<T>

      if (updateFilter.$set) {
        ;(updateFilter.$set as any).updatedAt = now
      } else {
        updateFilter.$set = { updatedAt: now } as any
      }
    } else {
      // Not atomic: wrap the update in a $set operator.
      updateFilter = { $set: { ...update, updatedAt: now } } as UpdateFilter<T>
    }

    return collection.updateOne(filter, updateFilter, options)
  }

  /**
   * Generic pagination method for any collection
   */
  static async paginateCollection<T extends Document = Document>(
    collection: Collection<T>,
    query: Filter<T>,
    pagination: PaginationParams,
    options?: {
      projection?: Record<string, number>
      sort?: Record<string, 1 | -1>
    },
  ): Promise<PaginatedResponse<WithId<T>>> {
    const { page: possiblePage, limit: possibleLimit } = pagination

    const limit = possibleLimit ?? Number(process.env.PAGINATION_DEFAULT_LIMIT)
    const page = possiblePage ?? 1
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

  /**
   * Disconnect from MongoDB.
   */
  static async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
      console.log('Disconnected from MongoDB')
    }
  }
}
