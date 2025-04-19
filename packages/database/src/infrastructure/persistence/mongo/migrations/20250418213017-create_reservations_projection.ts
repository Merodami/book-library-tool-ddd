// @ts-nocheck

export async function up(db, client) {
  const targetDbName = process.env.MONGO_DB_NAME_EVENT || 'events'
  const collectionName = 'reservation_projection'
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
  await coll.createIndex({ userId: 1 }) // search by user
  await coll.createIndex({ isbn: 1 }) // search by book
  await coll.createIndex({ status: 1 }) // filter by status
  await coll.createIndex({ userId: 1, isbn: 1 }) // find active by user and book
  await coll.createIndex({ userId: 1, status: 1 }) // get user reservations by status
  await coll.createIndex({ isbn: 1, status: 1 }) // get book reservations by status
  await coll.createIndex({ dueDate: 1 }) // for finding overdue reservations
  await coll.createIndex({ reservedAt: 1 }) // for sorting by reservation date
  await coll.createIndex({ deletedAt: 1 }) // soft-delete filter
  await coll.createIndex({ id: 1, version: 1 }) // optimistic concurrency
}

export async function down(db, client) {
  const targetDbName = process.env.MONGO_DB_NAME_EVENT || 'events'
  const collectionName = 'reservation_projection'
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
  await drop('isbn_1')
  await drop('status_1')
  await drop('userId_1_isbn_1')
  await drop('userId_1_status_1')
  await drop('isbn_1_status_1')
  await drop('dueDate_1')
  await drop('reservedAt_1')
  await drop('deletedAt_1')
  await drop('id_1_version_1')

  // Drop the collection if empty or after indexes removed
  try {
    await targetDb.dropCollection(collectionName)
  } catch {
    // ignore if collection does not exist
  }
}
