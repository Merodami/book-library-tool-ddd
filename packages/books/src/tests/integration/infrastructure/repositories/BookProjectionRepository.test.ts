import { schemas } from '@book-library-tool/api'
import type { BookUpdateRequest } from '@book-library-tool/sdk'
import { BookProjectionRepository } from '@books/persistence/mongo/BookProjectionRepository.js'
import type { BookDocument } from '@books/persistence/mongo/documents/BookDocument.js'
import { Collection, MongoClient } from 'mongodb'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('BookProjectionRepository Integration', () => {
  let container: StartedTestContainer
  let client: MongoClient
  let collection: Collection<BookDocument>
  let repository: BookProjectionRepository
  let testBookId: string

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
    const baseBook: schemas.Book = {
      id: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 19.99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await repository.saveBookProjection(baseBook)

    // Save the ID for later use
    const savedBook = await collection.findOne({ isbn: baseBook.isbn })

    testBookId = savedBook?.id || '5a1018f2-3526-4275-a84b-784e4f2e5a10'
  })

  afterAll(async () => {
    await client.close()
    await container.stop()
  })

  describe('getBookByIsbn', () => {
    it('returns the book when it exists', async () => {
      // Changed from getBookByISBN to getBookByIsbn
      const result = await repository.getBookByIsbn('978-3-16-148410-0')

      expect(result).not.toBeNull()
      expect(result?.isbn).toBe('978-3-16-148410-0')
      expect(result?.title).toBe('Test Book')
    })

    it('returns null for non-existent ISBN', async () => {
      // Changed from getBookByISBN to getBookByIsbn
      const result = await repository.getBookByIsbn('no-such')

      expect(result).toBeNull()
    })
  })

  describe('getAllBooks', () => {
    it('returns paginated books', async () => {
      const second: schemas.Book = {
        id: '5a1018f2-3526-4275-a84b-784e4f2e5a11',
        isbn: '978-3-16-148410-1',
        title: 'Another',
        author: 'Author',
        publicationYear: 2024,
        publisher: 'Publisher',
        price: 29.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await repository.saveBookProjection(second)

      const query: schemas.CatalogSearchQuery = { page: 1, limit: 10 }
      const resp: schemas.PaginatedResult<schemas.Book> =
        await repository.getAllBooks(query)

      expect(resp.data).toHaveLength(2)
      expect(resp.pagination.total).toBe(2)
    })

    it('filters by title', async () => {
      const query: schemas.CatalogSearchQuery = {
        title: 'Test',
        page: 1,
        limit: 10,
      }
      const resp = await repository.getAllBooks(query)

      expect(resp.data.every((b) => b.title?.includes('Test'))).toBe(true)
    })
  })

  describe('saveProjection and updateProjection', () => {
    it('saves and updates correctly', async () => {
      const newBook: schemas.Book = {
        id: '46decb22-c152-482b-909e-693c20e416a6',
        isbn: '978-3-16-148410-2',
        title: 'New',
        author: 'New',
        publicationYear: 2025,
        publisher: 'New',
        price: 39.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await repository.saveBookProjection(newBook)

      // Changed from getBookByISBN to getBookByIsbn
      let fetched = await repository.getBookByIsbn(newBook.isbn || '')

      expect(fetched).not.toBeNull()

      const doc = await collection.findOne({ isbn: newBook.isbn })

      if (!doc) {
        throw new Error('Book document not found')
      }

      const id = doc.id
      const updates: BookUpdateRequest = { title: 'Updated', author: 'Edited' }

      if (!id) {
        throw new Error('Book ID is null')
      }

      // Include updatedAt timestamp as third parameter
      await repository.updateBookProjection(id, updates, new Date())

      // Changed from getBookByISBN to getBookByIsbn
      fetched = await repository.getBookByIsbn(newBook.isbn || '')
      expect(fetched?.title).toBe('Updated')
      expect(fetched?.author).toBe('Edited')
    })
  })

  describe('markAsDeleted and findBookForReservation', () => {
    it('soft-deletes and excludes', async () => {
      // Use the saved testBookId directly instead of looking it up again
      const ts = new Date()

      await repository.markAsDeleted(testBookId, ts)

      const all = await repository.getAllBooks({ page: 1, limit: 10 })

      expect(all.data).toHaveLength(0)

      const found = await repository.getBookById('978-3-16-148410-0')

      expect(found).toBeNull()
    })
  })
})
