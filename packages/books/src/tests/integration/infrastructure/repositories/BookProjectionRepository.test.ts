// tests/integration/infrastructure/repositories/BookProjectionRepository.test.ts
import type {
  Book,
  BookUpdateRequest,
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { BookProjectionRepository } from '@books/persistence/mongo/BookProjectionRepository.js'
import type { BookDocument } from '@books/persistence/mongo/documents/BookDocument.js'
import { Collection, MongoClient } from 'mongodb'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('BookProjectionRepository Integration (Testcontainers v10.24.2)', () => {
  let container: StartedTestContainer
  let client: MongoClient
  let collection: Collection<BookDocument>
  let repository: BookProjectionRepository

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

    const db = client.db('book-library-test')

    collection = db.collection<BookDocument>('book_projection')
    repository = new BookProjectionRepository(collection)
  })

  beforeEach(async () => {
    await collection.deleteMany({})

    // Insert baseline book via repository to ensure correct mapping
    const baseBook: Book = {
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 19.99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await repository.saveProjection(baseBook)
  })

  afterAll(async () => {
    await client.close()
    await container.stop()
  })

  describe('getBookByISBN', () => {
    it('returns the book when it exists', async () => {
      const result = await repository.getBookByISBN('978-3-16-148410-0')

      expect(result).not.toBeNull()
      expect(result?.isbn).toBe('978-3-16-148410-0')
      expect(result?.title).toBe('Test Book')
    })

    it('returns null for non-existent ISBN', async () => {
      const result = await repository.getBookByISBN('no-such')

      expect(result).toBeNull()
    })
  })

  describe('getAllBooks', () => {
    it('returns paginated books', async () => {
      const second: Book = {
        isbn: '978-3-16-148410-1',
        title: 'Another',
        author: 'Author',
        publicationYear: 2024,
        publisher: 'Publisher',
        price: 29.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await repository.saveProjection(second)

      const query: CatalogSearchQuery = { skip: 0, limit: 10 }
      const resp: PaginatedBookResponse = await repository.getAllBooks(query)

      expect(resp.data).toHaveLength(2)
      expect(resp.pagination.total).toBe(2)
    })

    it('filters by title', async () => {
      const query: CatalogSearchQuery = { title: 'Test', skip: 0, limit: 10 }
      const resp = await repository.getAllBooks(query)

      expect(resp.data.every((b) => b.title.includes('Test'))).toBe(true)
    })
  })

  describe('saveProjection and updateProjection', () => {
    it('saves and updates correctly', async () => {
      const newBook: Book = {
        isbn: '978-3-16-148410-2',
        title: 'New',
        author: 'New',
        publicationYear: 2025,
        publisher: 'New',
        price: 39.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await repository.saveProjection(newBook)

      let fetched = await repository.getBookByISBN(newBook.isbn)

      expect(fetched).not.toBeNull()

      const doc = await collection.findOne({ isbn: newBook.isbn })!
      const id = doc?._id.toString()
      const updates: BookUpdateRequest = { title: 'Updated', author: 'Edited' }

      if (!id) {
        throw new Error('Book ID is null')
      }

      await repository.updateProjection(id, updates)

      fetched = await repository.getBookByISBN(newBook.isbn)
      expect(fetched?.title).toBe('Updated')
      expect(fetched?.author).toBe('Edited')
    })
  })

  describe('markAsDeleted and findBookForReservation', () => {
    it('soft-deletes and excludes', async () => {
      const doc = await collection.findOne({ isbn: '978-3-16-148410-0' })!
      const id = doc?._id.toString()
      const ts = new Date()

      if (!id) {
        throw new Error('Book ID is null')
      }

      await repository.markAsDeleted(id, ts)

      const all = await repository.getAllBooks({ skip: 0, limit: 10 })

      expect(all.data).toHaveLength(0)

      const found = await repository.findBookForReservation('978-3-16-148410-0')

      expect(found).toBeNull()
    })
  })
})
