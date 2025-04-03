/* eslint-disable */

// Switch to the desired database
const db = db.getSiblingDB('books-dev')

// Create and initialize the "books" collection
db.createCollection('books')
// Create indexes to support fast lookups
db.books.createIndex({ title: 1 })
db.books.createIndex({ author: 1 })
db.books.createIndex({ publicationYear: 1 })

// Create and initialize the "users" collection
db.createCollection('users')
// Enforce uniqueness on the email field
db.users.createIndex({ email: 1 }, { unique: true })

// Create and initialize the "reservations" collection
db.createCollection('reservations')

// Create indexes for querying reservations
db.reservations.createIndex({ userId: 1 })
db.reservations.createIndex({ referenceId: 1 })
db.reservations.createIndex({ reservedAt: -1 }) // for sorting by latest reservations

// Create and initialize the "wallets" collection
db.createCollection('wallets')

// Ensure that each user has only one wallet
db.wallets.createIndex({ userId: 1 }, { unique: true })

print('MongoDB initialization complete.')
