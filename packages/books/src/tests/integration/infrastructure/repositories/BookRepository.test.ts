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
      const createEvt: DomainEvent = {
        aggregateId: aggId,
        eventType: BOOK_CREATED,
        payload: {
          id: 'isbn-1', // Adding id field to match payload expectations
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

      const found = await repository.findAggregateIdById('isbn-1')

      expect(found).toBe(aggId)
    })

    it('returns null if deleted', async () => {
      const aggId = randomUUID()
      const createEvt: DomainEvent = {
        aggregateId: aggId,
        eventType: BOOK_CREATED,
        payload: {
          id: aggId, // Use the aggregateId as the id (not isbn)
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

      // Use the aggregateId to look up, not the isbn
      const found = await repository.findAggregateIdById(aggId)

      expect(found).toBeNull()
    })

    it('ignores deleted aggregates when multiple exist', async () => {
      const id1 = randomUUID(),
        id2 = randomUUID()
      const event1: DomainEvent = {
        aggregateId: id1,
        eventType: BOOK_CREATED,
        payload: {
          id: id1, // Use aggregateId1 as the id
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
          id: id2, // Use aggregateId2 as the id
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

      // Use id2 to look up, not isbn
      const found = await repository.findAggregateIdById(id2)

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
})
