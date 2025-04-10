const tableName = 'event_store'

export async function up(db) {
  const client = db.client
  const targetDb = client.db(
    process.env.MONGO_EVENT_COLLECTION_NAME || 'events',
  )

  // Check if the collection already exists or create it.
  const targetCollection = targetDb.collection(tableName)

  // Create a unique index on aggregateId and version to enforce optimistic concurrency.
  await targetCollection.createIndex(
    { aggregateId: 1, version: 1 },
    { unique: true },
  )
}

/**
 * Reverse the migration: drop the unique index or even the collection.
 */
export async function down(db) {
  const client = db.client
  const targetDb = client.db(
    process.env.MONGO_EVENT_COLLECTION_NAME || 'events',
  )

  // Remove the unique index; dropping the collection might be too destructive in production.
  await targetDb.collection(tableName).dropIndex({ aggregateId: 1, version: 1 })

  // Drop the collection
  await targetDb.collection(tableName).drop()
}
