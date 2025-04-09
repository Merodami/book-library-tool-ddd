export async function up(db) {
  // Check if the collection already exists.
  const collections = await db.collections()
  const exists = collections.some((c) => c.collectionName === 'event_store')

  if (!exists) {
    await db.createCollection('event_store')
  }

  // Create a unique index on aggregateId and version to enforce optimistic concurrency.
  await db
    .collection('event_store')
    .createIndex({ aggregateId: 1, version: 1 }, { unique: true })
}

/**
 * Reverse the migration: drop the unique index or even the collection.
 */
export async function down(db) {
  // Remove the unique index; dropping the collection might be too destructive in production.
  await db.collection('event_store').dropIndex({ aggregateId: 1, version: 1 })

  // Drop the collection
  await db.collection('event_store').drop()
}
