import { MongoClient } from 'mongodb'

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

    // ------------------------------
    // Wallets Collection
    // ------------------------------
    // This collection stores user balances and fee-related transactions.
    // A unique index on userId ensures each user has only one wallet.
    const walletsCollection = db.collection('wallets')
    await walletsCollection.createIndex({ userId: 1 }, { unique: true })
  } catch (err) {
    throw new Error(`Failed to initialize database: ${err.message}`)
  } finally {
    await client.close()
  }
}

// Execute the initialization.
initDatabase()
