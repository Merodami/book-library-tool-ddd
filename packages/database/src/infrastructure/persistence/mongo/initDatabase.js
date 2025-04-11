import { MongoClient } from 'mongodb'

/**
 * Initializes the MongoDB database for the library system.
 * This function connects to the MongoDB server, creates a database,
 * and sets up the necessary collections with indexes.
 * It ensures that the database is ready for use by creating
 * the required collections and indexes.
 * @throws Will throw an error if the database connection fails or if
 * the collection creation fails.
 */
async function initDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017'

  if (!uri) {
    throw new Error('MONGO_URI is not defined in the environment variables')
  }

  const client = new MongoClient(uri, {})

  await client.connect()

  const db = client.db(process.env.MONGO_DB_NAME_LIBRARY || 'library')

  try {
    // ------------------------------
    // Users Collection
    // ------------------------------
    // This collection will hold around 50k users.
    // We create unique indexes on email and userId to ensure fast lookup.
    const usersCollection = db.collection('users')
    await usersCollection.createIndex({ email: 1 }, { unique: true })
    await usersCollection.createIndex({ userId: 1 }, { unique: true })
  } catch (err) {
    throw new Error(`Failed to initialize database: ${err.message}`)
  } finally {
    await client.close()
  }
}

// Execute the initialization.
initDatabase()
