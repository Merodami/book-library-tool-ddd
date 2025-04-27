import { MongoDatabaseService } from '@book-library-tool/database'
import { BOOK_CREATED, BOOK_DELETED } from '@book-library-tool/event-store'
import type { DomainEvent } from '@book-library-tool/shared'
import { Book } from '@books/domain/index.js'
import {
  BookReadRepository,
  BookWriteRepository,
} from '@books/infrastructure/index.js'
import { randomUUID } from 'crypto'
import { MongoClient } from 'mongodb'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('BookRepository Integration (Testcontainers v10.24.2)', () => {
  let container: StartedTestContainer
  let client: MongoClient
  let dbService: MongoDatabaseService
  let repositoryWrite: BookWriteRepository
  let repositoryRead: BookReadRepository

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

    const collection = dbService.getCollection<DomainEvent>('events')

    repositoryWrite = new BookWriteRepository(collection, dbService)
    repositoryRead = new BookReadRepository(collection)
  })

  beforeEach(async () => {
    await dbService.getCollection('events').deleteMany({})
  })

  afterAll(async () => {
    await client.close()
    await container.stop()
  })

  describe('findAggregateIdById', () => {
    it('should return null when no book exists', async () => {
      const id = randomUUID()
      const result = await repositoryRead.findAggregateIdById(id)

      expect(result).toBeNull()
    })

    it('should return the aggregate id when book exists', async () => {
      const id = randomUUID()
      const aggregateId = randomUUID()

      await dbService.getCollection<DomainEvent>('events').insertOne({
        aggregateId,
        eventType: BOOK_CREATED,
        version: 1,
        schemaVersion: 1,
        timestamp: new Date(),
        payload: {
          id,
          title: 'Test Book',
          author: 'Test Author',
          isbn: '1234567890',
        },
      })

      const result = await repositoryRead.findAggregateIdById(id)

      expect(result).toBe(aggregateId)
    })

    it('should return null when book is deleted', async () => {
      const id = randomUUID()
      const aggregateId = randomUUID()

      await dbService.getCollection<DomainEvent>('events').insertMany([
        {
          aggregateId,
          eventType: BOOK_CREATED,
          version: 1,
          schemaVersion: 1,
          timestamp: new Date(),
          payload: {
            id,
            title: 'Test Book',
            author: 'Test Author',
            isbn: '1234567890',
          },
        },
        {
          aggregateId,
          eventType: BOOK_DELETED,
          version: 2,
          schemaVersion: 1,
          timestamp: new Date(),
          payload: {
            id,
          },
        },
      ])

      const result = await repositoryRead.findAggregateIdById(id)

      expect(result).toBeNull()
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

      await repositoryWrite.saveEvents(book.id, [createEvt], 0)
      await repositoryWrite.saveEvents(book.id, [updateEvt], 1)
      await repositoryWrite.saveEvents(book.id, [deleteEvt], 2)

      const rehydrated = await repositoryRead.getById(book.id)

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

      await repositoryWrite.saveEvents(aggId, [event1], 0)

      const storedEvents = await repositoryRead.getEventsForAggregate(aggId)

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
      await repositoryWrite.saveEvents(aggId, [initialEvent], 0)

      // Then append the batch
      await repositoryWrite.appendBatch(aggId, batchEvents, 1)

      // Verify all events were stored with correct versions
      const storedEvents = await repositoryRead.getEventsForAggregate(aggId)

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
