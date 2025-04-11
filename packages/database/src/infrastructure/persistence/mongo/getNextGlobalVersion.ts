import type { Db } from 'mongodb'

/**
 * Define the interface for the counter document.
 * Here _id is a string and seq holds the current global version as a number.
 */
interface CounterDocument {
  _id: string
  seq: number
}

/**
 * Atomically reserves a block of global version numbers.
 *
 * @param db - The MongoDB database instance.
 * @param batchSize - The number of global versions to reserve.
 * @returns The current (latest) global version after incrementing.
 *
 * This function uses the "counters" collection and a document with _id "globalVersion".
 * It atomically increments the counter and returns the new value.
 *
 * In production, you might reserve a block of numbers to reduce contention.
 */
export async function getNextGlobalVersion(
  db: Db,
  batchSize: number = 1,
): Promise<number> {
  // Use the ModifyResult type which is returned by findOneAndUpdate
  const result = await db
    .collection<CounterDocument>('counters')
    .findOneAndUpdate(
      { _id: 'globalVersion' }, // Use a string as the _id
      { $inc: { seq: batchSize } },
      { returnDocument: 'after', upsert: true },
    )

  // Ensure that the result has a value.
  if (!result) {
    throw new Error('Failed to update global version counter.')
  }

  // Return the new global version (the current counter value)
  return result.seq
}
