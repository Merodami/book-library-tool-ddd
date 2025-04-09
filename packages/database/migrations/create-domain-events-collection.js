const tableName = 'event_store'

export async function up(db) {
  const client = db.client
  const targetDb = client.db('event')

  // Check if the collection already exists.
  const collections = await targetDb.collections()
  const exists = collections.some((c) => c.collectionName === tableName)

  if (!exists) {
    await targetDb.createCollection(tableName)
  }

  // Create a unique index on aggregateId and version to enforce optimistic concurrency.
  await targetDb
    .collection(tableName)
    .createIndex({ aggregateId: 1, version: 1 }, { unique: true })
}

/**
 * Reverse the migration: drop the unique index or even the collection.
 */
export async function down(db) {
  const client = db.client
  const targetDb = client.db('event')

  // Remove the unique index; dropping the collection might be too destructive in production.
  await targetDb.collection(tableName).dropIndex({ aggregateId: 1, version: 1 })

  // Drop the collection
  await targetDb.collection(tableName).drop()
}
