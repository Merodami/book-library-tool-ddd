import { MongoDatabaseService } from './MongoDatabaseService.js'

/**
 * Initializes the MongoDB database by creating collections and setting up indexes.
 *
 * Collections:
 * - books: Stores up to 100M book references.
 *   Indexes: title, author, publicationYear.
 *
 * - users: Stores user data (~50k users).
 *   Indexes: unique indexes on email and userId.
 *
 * - reservations: Tracks reservations, borrowings, and history.
 *   Indexes: userId, referenceId, and reservedAt (for sorting).
 *
 * - wallets: Stores user wallet balances and fee-related transactions.
 *   Index: unique index on userId.
 */
async function initDatabase() {
  // Create an instance of our MongoDatabaseService.
  const databaseService = new MongoDatabaseService()

  try {
    // Connect to the MongoDB database.
    await databaseService.connect()

    // ------------------------------
    // Books Collection (References)
    // ------------------------------
    // This collection will hold up to 100M book references.
    // We create indexes on key fields to support fast queries.
    const booksCollection = await databaseService.getCollection('books')
    await booksCollection.createIndex({ title: 1 })
    await booksCollection.createIndex({ author: 1 })
    await booksCollection.createIndex({ publicationYear: 1 })
    console.log('Books collection indexes created.')

    // ------------------------------
    // Users Collection
    // ------------------------------
    // This collection will hold around 50k users.
    // We create unique indexes on email and userId to ensure fast lookup.
    const usersCollection = await databaseService.getCollection('users')
    await usersCollection.createIndex({ email: 1 }, { unique: true })
    await usersCollection.createIndex({ userId: 1 }, { unique: true })
    console.log('Users collection indexes created.')

    // ------------------------------
    // Reservations/Borrowing Records Collection
    // ------------------------------
    // This collection tracks reservations, borrowings, and history.
    // We create indexes on userId, referenceId, and reservedAt for efficient queries.
    const reservationsCollection =
      await databaseService.getCollection('reservations')
    await reservationsCollection.createIndex({ userId: 1 })
    await reservationsCollection.createIndex({ referenceId: 1 })
    await reservationsCollection.createIndex({ reservedAt: -1 }) // sort by latest reservations first
    console.log('Reservations collection indexes created.')

    // ------------------------------
    // Wallets Collection
    // ------------------------------
    // This collection stores user balances and fee-related transactions.
    // A unique index on userId ensures each user has only one wallet.
    const walletsCollection = await databaseService.getCollection('wallets')
    await walletsCollection.createIndex({ userId: 1 }, { unique: true })
    console.log('Wallets collection indexes created.')

    console.log('Database initialization complete.')
  } catch (err) {
    console.error('Error initializing database:', err)
  } finally {
    await databaseService.disconnect()
  }
}

// Execute the initialization.
initDatabase()
