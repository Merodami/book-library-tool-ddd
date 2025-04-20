// tests/integration/infrastructure/repositories/BookRepository.test.ts
import { MongoDatabaseService } from '@book-library-tool/database'
import {
  BOOK_CREATED,
  BOOK_DELETED,
  type DomainEvent,
} from '@book-library-tool/event-store'
import { Book } from '@books/entities/Book.js'
import { BookRepository } from '@books/persistence/mongo/BookRepository.js'
import { randomUUID } from 'crypto'
import { MongoClient } from 'mongodb'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('BookRepository Integration (Testcontainers v10.24.2)', () => {
  let container: StartedTestContainer
  let client: MongoClient
  let dbService: MongoDatabaseService
  let repository: BookRepository

  beforeAll(async () => {
    container = await new GenericContainer('mongo:6.0')
      .withExposedPorts(27017)
      .withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: 'root',
        MONGO_INITDB_ROOT_PASSWORD: 'example',
      })
      .withWaitStrategy(Wait.forLogMessage('Waiting for connections'))
      .start()

    const host = container.getHost()
    const port = container.getMappedPort(27017)
    const uri = `mongodb://root:example@${host}:${port}/?authSource=admin`

    client = new MongoClient(uri)
    await client.connect()

    process.env.MONGO_URI = uri
    process.env.MONGO_DB_NAME_LIBRARY = 'book-event-test'

    dbService = new MongoDatabaseService('book-event-test')

    await dbService.connect()

    repository = new BookRepository(dbService)
  })

  beforeEach(async () => {
    await dbService.getCollection<DomainEvent>('event_store').deleteMany({})
  })

  afterAll(async () => {
    await dbService.disconnect()
    await container.stop()
    await client.close()
  })

  describe('findAggregateIdById', () => {
    it('returns null when no BOOK_CREATED events', async () => {
      const id = await repository.findAggregateIdById('nonexistent')

      expect(id).toBeNull()
    })

    it('returns the aggregateId for a single BOOK_CREATED event', async () => {
      const aggId = randomUUID()
      const bookId = randomUUID() // Different ID to test lookup by ID field

      const createEvt: DomainEvent = {
        aggregateId: aggId,
        eventType: BOOK_CREATED,
        payload: {
          id: bookId, // Use separate ID field
          isbn: 'isbn-1',
          title: 'T',
          author: 'A',
          publicationYear: 2020,
          publisher: 'P',
          price: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        version: 1,
        schemaVersion: 1,
      }

      await dbService
        .getCollection<DomainEvent>('event_store')
        .insertOne(createEvt)

      const found = await repository.findAggregateIdById(bookId)

      expect(found).toBe(aggId)
    })

    it('returns null if deleted', async () => {
      const aggId = randomUUID()
      const bookId = randomUUID() // Different ID to test lookup by ID field

      const createEvt: DomainEvent = {
        aggregateId: aggId,
        eventType: BOOK_CREATED,
        payload: {
          id: bookId, // Use separate ID field
          isbn: 'isbn-2',
          title: 'T',
          author: 'A',
          publicationYear: 2021,
          publisher: 'P',
          price: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        version: 1,
        schemaVersion: 1,
      }

      const deleteEvt: DomainEvent = {
        aggregateId: aggId,
        eventType: BOOK_DELETED,
        payload: { deletedAt: new Date().toISOString() },
        timestamp: new Date(),
        version: 2,
        schemaVersion: 1,
      }

      await dbService
        .getCollection<DomainEvent>('event_store')
        .insertMany([createEvt, deleteEvt])

      // Search by book ID, not aggregate ID
      const found = await repository.findAggregateIdById(bookId)

      expect(found).toBeNull()
    })

    it('ignores deleted aggregates when multiple exist', async () => {
      const id1 = randomUUID() // First aggregate ID
      const id2 = randomUUID() // Second aggregate ID
      const bookId = randomUUID() // Common book ID for both aggregates

      const event1: DomainEvent = {
        aggregateId: id1,
        eventType: BOOK_CREATED,
        payload: {
          id: bookId, // Same book ID for multiple aggregates
          isbn: 'isbn-3',
          title: '',
          author: '',
          publicationYear: 0,
          publisher: '',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        version: 1,
        schemaVersion: 1,
      }

      const event2: DomainEvent = {
        aggregateId: id1,
        eventType: BOOK_DELETED,
        payload: { deletedAt: new Date().toISOString() },
        timestamp: new Date(),
        version: 2,
        schemaVersion: 1,
      }

      const event3: DomainEvent = {
        aggregateId: id2,
        eventType: BOOK_CREATED,
        payload: {
          id: bookId, // Same book ID reused
          isbn: 'isbn-3',
          title: '',
          author: '',
          publicationYear: 0,
          publisher: '',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        version: 1,
        schemaVersion: 1,
      }

      await repository.saveEvents(id1, [event1], 0)
      await repository.saveEvents(id1, [event2], 1)
      await repository.saveEvents(id2, [event3], 0)

      // Search by book ID, which exists in multiple aggregates
      const found = await repository.findAggregateIdById(bookId)

      // Should return the non-deleted aggregate
      expect(found).toBe(id2)
    })
  })

  describe('getById / rehydration', () => {
    it('rehydrates with create, update, delete events', async () => {
      const { book, event: createEvt } = Book.create({
        isbn: 'isbn-4',
        title: 'Orig',
        author: 'Auth',
        publicationYear: 2000,
        publisher: 'Pub',
        price: 5,
      })
      const { event: updateEvt } = book.update({ title: 'Updated' })
      const { event: deleteEvt } = book.delete()

      await repository.saveEvents(book.id, [createEvt], 0)
      await repository.saveEvents(book.id, [updateEvt], 1)
      await repository.saveEvents(book.id, [deleteEvt], 2)

      const rehydrated = await repository.getById(book.id)

      expect(rehydrated).not.toBeNull()
      expect(rehydrated?.isbn).toBe('isbn-4')
      expect(rehydrated?.title).toBe('Updated')
      expect(rehydrated?.isDeleted()).toBe(true)
      expect(rehydrated?.version).toBe(3)
    })
  })

  describe('saveEvents', () => {
    it('should save a sequence of events with correct versioning', async () => {
      const aggId = randomUUID()
      const bookId = randomUUID()

      const event1: DomainEvent = {
        aggregateId: aggId,
        eventType: BOOK_CREATED,
        payload: {
          id: bookId,
          isbn: 'isbn-test',
          title: 'Original Title',
          author: 'Author',
          publicationYear: 2023,
          publisher: 'Publisher',
          price: 19.99,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        version: 1, // This will be overridden by repository
        schemaVersion: 1,
      }

      await repository.saveEvents(aggId, [event1], 0)

      const storedEvents = await repository.getEventsForAggregate(aggId)

      expect(storedEvents).toHaveLength(1)
      expect(storedEvents[0].version).toBe(1)
      expect(storedEvents[0].globalVersion).toBeDefined()
      expect(storedEvents[0].metadata).toBeDefined()
      expect(storedEvents[0].metadata?.correlationId).toBeDefined()
    })
  })

  describe('appendBatch', () => {
    it('should append multiple events atomically', async () => {
      const aggId = randomUUID()
      const bookId = randomUUID()

      // Create initial event
      const initialEvent: DomainEvent = {
        aggregateId: aggId,
        eventType: BOOK_CREATED,
        payload: {
          id: bookId,
          isbn: 'isbn-batch',
          title: 'Batch Test',
          author: 'Batch Author',
          publicationYear: 2023,
          publisher: 'Batch Publisher',
          price: 29.99,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        version: 1,
        schemaVersion: 1,
      }

      // Create batch of events to append
      const batchEvents: DomainEvent[] = [
        {
          aggregateId: aggId,
          eventType: 'BOOK_TITLE_CHANGED',
          payload: {
            previous: 'Batch Test',
            updated: 'New Batch Title',
          },
          timestamp: new Date(),
          version: 2, // Will be set by repository
          schemaVersion: 1,
        },
        {
          aggregateId: aggId,
          eventType: 'BOOK_PRICE_CHANGED',
          payload: {
            previous: 29.99,
            updated: 39.99,
          },
          timestamp: new Date(),
          version: 3, // Will be set by repository
          schemaVersion: 1,
        },
      ]

      // First save the initial event
      await repository.saveEvents(aggId, [initialEvent], 0)

      // Then append the batch
      await repository.appendBatch(aggId, batchEvents, 1)

      // Verify all events were stored with correct versions
      const storedEvents = await repository.getEventsForAggregate(aggId)

      expect(storedEvents).toHaveLength(3)
      expect(storedEvents[0].version).toBe(1)
      expect(storedEvents[1].version).toBe(2)
      expect(storedEvents[2].version).toBe(3)

      // Verify global versioning is sequential
      expect(storedEvents[1].globalVersion!).toBe(
        storedEvents[0].globalVersion! + 1,
      )

      expect(storedEvents[2].globalVersion!).toBe(
        storedEvents[1].globalVersion! + 1,
      )
    })
  })
})
