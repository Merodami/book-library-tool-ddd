import { DatabaseService } from './databaseService.js'

async function initDatabase() {
  try {
    // Connect to the database.
    await DatabaseService.connect()

    // ------------------------------
    // Books Collection (References)
    // ------------------------------
    // This collection will hold up to 100M book references.
    // We create indexes on key fields to support fast queries.
    const booksCollection = await DatabaseService.getCollection('books')
    await booksCollection.createIndex({ title: 1 })
    await booksCollection.createIndex({ author: 1 })
    await booksCollection.createIndex({ publicationYear: 1 })
    console.log('Books collection indexes created.')

    // ------------------------------
    // Users Collection
    // ------------------------------
    // This collection will hold around 50k users.
    // We create a unique index on email and userId to ensure fast lookup.
    const usersCollection = await DatabaseService.getCollection('users')
    await usersCollection.createIndex({ email: 1 }, { unique: true })
    await usersCollection.createIndex({ userId: 1 }, { unique: true })
    console.log('Users collection indexes created.')

    // ------------------------------
    // Reservations/Borrowing Records Collection
    // ------------------------------
    // This collection tracks reservations, borrowings, and history.
    // Index on userId and bookId supports lookups, and sorting by reservedAt
    const reservationsCollection =
      await DatabaseService.getCollection('reservations')

    await reservationsCollection.createIndex({ userId: 1 })
    await reservationsCollection.createIndex({ bookId: 1 })
    await reservationsCollection.createIndex({ reservedAt: -1 }) // for sorting recent first
    console.log('Reservations collection indexes created.')

    // ------------------------------
    // Wallets Collection
    // ------------------------------
    // This collection stores user balances and fee-related transactions.
    // Using a unique index on userId to quickly fetch a user's wallet.
    const walletsCollection = await DatabaseService.getCollection('wallets')
    await walletsCollection.createIndex({ userId: 1 }, { unique: true })
    console.log('Wallets collection indexes created.')

    console.log('Database initialization complete.')
  } catch (err) {
    console.error('Error initializing database:', err)
  } finally {
    await DatabaseService.disconnect()
  }
}

initDatabase()
