const tableName = 'book_projections'

/**
 * Create a book_projections collection with appropriate indexes for efficient querying
 */
export async function up(db) {
  const client = db.client
  const targetDb = client.db('event')

  // Check if the book_projections collection already exists
  const collections = await targetDb.collections()
  const exists = collections.some((c) => c.collectionName === tableName)

  if (!exists) {
    await targetDb.createCollection(tableName)
  }

  // Create a unique index on id (the aggregate ID)
  await db.collection(tableName).createIndex({ id: 1 }, { unique: true })

  // Create a unique index on isbn for business identifier lookups
  await db.collection(tableName).createIndex({ isbn: 1 }, { unique: true })

  // Create indexes for common search patterns
  await targetDb.collection(tableName).createIndex({ title: 1 })

  await targetDb.collection(tableName).createIndex({ author: 1 })

  await targetDb.collection(tableName).createIndex({ publicationYear: 1 })

  // Compound index for more complex queries
  await targetDb.collection(tableName).createIndex({
    title: 1,
    author: 1,
    publicationYear: 1,
  })

  // Index to efficiently filter out deleted books
  await targetDb.collection(tableName).createIndex({ isDeleted: 1 })

  // Create version index for optimistic concurrency
  await targetDb.collection(tableName).createIndex({ id: 1, version: 1 })
}

/**
 * Reverse the migration: drop indexes and the collection
 */
export async function down(db) {
  const client = db.client
  const targetDb = client.db('event')

  // Drop all the indexes
  await targetDb.collection(tableName).dropIndex({ id: 1 })
  await targetDb.collection(tableName).dropIndex({ isbn: 1 })
  await targetDb.collection(tableName).dropIndex({ title: 1 })
  await targetDb.collection(tableName).dropIndex({ author: 1 })
  await targetDb.collection(tableName).dropIndex({ publicationYear: 1 })
  await targetDb.collection(tableName).dropIndex({
    title: 1,
    author: 1,
    publicationYear: 1,
  })
  await targetDb.collection(tableName).dropIndex({ isDeleted: 1 })
  await targetDb.collection(tableName).dropIndex({ id: 1, version: 1 })

  // Drop the collection
  await targetDb.collection(tableName).drop()
}
