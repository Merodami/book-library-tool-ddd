import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
  vi,
} from 'vitest'
import { randomUUID } from 'crypto'
import { setUpTestDatabase } from './testUtils/setUpTestDatabase.js'
import { DatabaseService } from './databaseService.js'

describe('DatabaseService', () => {
  // Set up the test database
  const db = setUpTestDatabase({ randomUUID })

  beforeAll(async () => {
    await db.beforeAllCallback()
  })

  afterAll(async () => {
    await db.afterAllCallback()
  })

  beforeEach(async () => {
    await db.beforeEachCallback()
  })

  describe('CRUD operations', () => {
    const testCollection = 'test_collection'

    it('should insert a document with timestamps', async () => {
      // Get the collection
      const collection = DatabaseService.getCollection(testCollection)

      // Create a test document
      const testDoc = { name: 'Test Document', value: 42 }

      // Insert the document
      const result = await DatabaseService.insertDocument(collection, testDoc)

      // Verify the insertion was successful
      expect(result.acknowledged).toBe(true)
      expect(result.insertedId).toBeDefined()

      // Retrieve the document to check timestamps
      const insertedDoc = await collection.findOne({ _id: result.insertedId })

      expect(insertedDoc).toBeDefined()
      expect(insertedDoc?.name).toBe('Test Document')
      expect(insertedDoc?.value).toBe(42)
      expect(insertedDoc?.createdAt).toBeDefined()
      expect(insertedDoc?.updatedAt).toBeDefined()
    })

    it('should find a document by query', async () => {
      // Get the collection
      const collection = DatabaseService.getCollection(testCollection)

      // Insert test documents
      await DatabaseService.insertDocument(collection, {
        name: 'Doc 1',
        value: 10,
      })
      await DatabaseService.insertDocument(collection, {
        name: 'Doc 2',
        value: 20,
      })

      // Find a document
      const foundDoc = await DatabaseService.findOne(collection, {
        name: 'Doc 2',
      })

      expect(foundDoc).toBeDefined()
      expect(foundDoc?.name).toBe('Doc 2')
      expect(foundDoc?.value).toBe(20)

      // By default, timestamps should be excluded
      expect(foundDoc?.createdAt).toBeUndefined()
      expect(foundDoc?.updatedAt).toBeUndefined()
    })

    it('should update a document with updated timestamp', async () => {
      // Get the collection
      const collection = DatabaseService.getCollection(testCollection)

      // Insert a test document
      const insertResult = await DatabaseService.insertDocument(collection, {
        name: 'Update Test',
        value: 100,
      })

      // Get the original document with timestamps
      const originalDoc = await collection.findOne({
        _id: insertResult.insertedId,
      })
      const originalUpdatedAt = originalDoc?.updatedAt

      vi.useFakeTimers()

      // Advance timers by 10 milliseconds
      vi.advanceTimersByTime(10)

      // Update the document
      await DatabaseService.updateDocument(
        collection,
        { _id: insertResult.insertedId },
        { value: 200 },
      )

      // Get the updated document
      const updatedDoc = await collection.findOne({
        _id: insertResult.insertedId,
      })

      expect(updatedDoc?.value).toBe(200)
      expect(updatedDoc?.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('should count documents correctly', async () => {
      // Get the collection
      const collection = DatabaseService.getCollection(testCollection)

      // Insert test documents
      await DatabaseService.insertDocument(collection, {
        type: 'A',
        active: true,
      })
      await DatabaseService.insertDocument(collection, {
        type: 'A',
        active: true,
      })
      await DatabaseService.insertDocument(collection, {
        type: 'B',
        active: false,
      })

      // Count documents
      const countA = await DatabaseService.countDocuments(collection, {
        type: 'A',
      })
      const countActive = await DatabaseService.countDocuments(collection, {
        active: true,
      })

      expect(countA).toBe(2)
      expect(countActive).toBe(2)
    })
  })
})
