import { Db } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { DatabaseService } from '../databaseService.js'

// Define a type for dependencies that might be injected
interface Dependencies {
  randomUUID?: () => string
}

/**
 * Sets up a test database using mongodb-memory-server
 * This provides an isolated MongoDB instance for testing
 */
export function setUpTestDatabase(dependencies?: Dependencies) {
  let mongoServer: MongoMemoryServer
  let originalMongoUri: string | undefined
  let originalDbName: string | undefined

  // Before all tests setup
  const beforeAllCallback = async () => {
    // Store original environment variables
    originalMongoUri = process.env.MONGO_URI
    originalDbName = process.env.MONGO_DB_NAME

    // Create a new MongoDB memory server instance
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()

    // Set environment variables for testing
    process.env.MONGO_URI = mongoUri
    process.env.MONGO_DB_NAME = 'test-db'

    // Connect to the test database
    await DatabaseService.connect()

    return {
      mongoUri,
      dbName: 'test-db',
    }
  }

  // After all tests cleanup
  const afterAllCallback = async () => {
    // Disconnect from test database
    await DatabaseService.disconnect()

    // Restore original environment variables
    if (originalMongoUri) {
      process.env.MONGO_URI = originalMongoUri
    } else {
      delete process.env.MONGO_URI
    }

    if (originalDbName) {
      process.env.MONGO_DB_NAME = originalDbName
    } else {
      delete process.env.MONGO_DB_NAME
    }

    // Stop the MongoDB memory server
    if (mongoServer) {
      await mongoServer.stop()
    }
  }

  // Before each test cleanup - can be used to reset collections
  const beforeEachCallback = async () => {
    const db = DatabaseService['db'] as Db
    if (!db) {
      throw new Error(
        'Database not connected. Make sure beforeAllCallback was called.',
      )
    }

    // Get all collection names
    const collections = await db.listCollections().toArray()

    // Clear all collections before each test for a clean state
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({})
    }
  }

  // Mock implementations of DatabaseService methods if needed
  const mockImplementations = () => {
    if (dependencies?.randomUUID) {
      // Example of how you could mock something for testing
      // Could replace this with any functionality you need to mock
      const randomUUID = dependencies.randomUUID
      return { randomUUID }
    }
    return {}
  }

  return {
    beforeAllCallback,
    afterAllCallback,
    beforeEachCallback,
    mockImplementations,
  }
}
