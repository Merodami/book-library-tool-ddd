// @ts-nocheck

export async function up(db, client) {
  const targetDbName = process.env.MONGO_DB_NAME_EVENT || 'events'
  const collectionName = 'wallet_projection'
  const targetDb = client.db(targetDbName)
  const coll = targetDb.collection(collectionName)

  // Ensure the collection exists
  const exists =
    (await targetDb.listCollections({ name: collectionName }).toArray())
      .length > 0

  if (!exists) {
    await targetDb.createCollection(collectionName)
  }

  // Indexes for business identifiers and query patterns
  await coll.createIndex({ id: 1 }, { unique: true }) // aggregate id
  await coll.createIndex({ userId: 1 }, { unique: true }) // natural key
  await coll.createIndex({ balance: 1 }) // for balance-based queries
  await coll.createIndex({ createdAt: 1 }) // for temporal queries
  await coll.createIndex({ updatedAt: 1 }) // for tracking updates
  await coll.createIndex({ deletedAt: 1 }) // soft-delete filter
  await coll.createIndex({ id: 1, version: 1 }) // optimistic concurrency
}

export async function down(db, client) {
  const targetDbName = process.env.MONGO_DB_NAME_EVENT || 'events'
  const collectionName = 'wallet_projection'
  const targetDb = client.db(targetDbName)
  const coll = targetDb.collection(collectionName)

  // Helper to drop an index by name, ignore errors if missing
  const drop = async (name) => {
    try {
      await coll.dropIndex(name)
    } catch {
      // ignore missing index
    }
  }

  await drop('id_1')
  await drop('userId_1')
  await drop('balance_1')
  await drop('createdAt_1')
  await drop('updatedAt_1')
  await drop('deletedAt_1')
  await drop('id_1_version_1')

  // Drop the collection if empty or after indexes removed
  try {
    await targetDb.dropCollection(collectionName)
  } catch {
    // ignore if collection does not exist
  }
}
