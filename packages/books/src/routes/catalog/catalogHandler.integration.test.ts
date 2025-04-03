import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
import { setUpTestDatabase } from '@book-library-tool/database/src/testUtils/setUpTestDatabase.js'
import express from 'express'
import request from 'supertest'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { DatabaseService } from '@book-library-tool/database'
import { paginationMiddleware, type Book } from '@book-library-tool/sdk'
import { schemas, validateQuery } from '@book-library-tool/api'

// Import the catalog handler
import { catalogHandler } from './catalogHandler.js'

describe('Catalog Handler Integration Tests', () => {
  const db = setUpTestDatabase({ randomUUID })
  let app: express.Express

  // Common test headers for requests
  const commonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer test-token',
  }

  // Sample books data for testing
  const testBooks: Book[] = [
    {
      id: '0515125628',
      title: 'The Target',
      author: 'Catherine Coulter',
      publicationYear: 1999,
      publisher: 'Jove Books',
      price: 27,
    },
    {
      id: '0679427279',
      title: 'The Evolution Man',
      author: 'Roy Lewis',
      publicationYear: 1993,
      publisher: 'Random House Inc',
      price: 19,
    },
    {
      id: '1234567890',
      title: 'Another Target Book',
      author: 'Jane Smith',
      publicationYear: 1999,
      publisher: 'Test Publisher',
      price: 30,
    },
    {
      id: '0987654321',
      title: 'Database Design',
      author: 'Catherine Johnson',
      publicationYear: 2005,
      publisher: 'Tech Press',
      price: 45,
    },
  ]

  // Setup database and express app before all tests
  beforeAll(async () => {
    // Set up the test environment variables
    await db.beforeAllCallback()

    // Explicitly connect to the database
    await DatabaseService.connect()

    // Set up the Express app with the catalog route including validation middleware
    app = express()
      .disable('x-powered-by')
      .use(cors())
      .use(express.json())
      .get(
        '/catalog',
        validateQuery(schemas.CatalogSearchQuerySchema),
        paginationMiddleware(),
        catalogHandler.searchCatalog,
      )
  })

  // Clean the database and insert test data before each test
  beforeEach(async () => {
    // Reset the database
    await db.beforeEachCallback()

    // Insert test books
    const booksCollection = DatabaseService.getCollection<Book>('books')

    // Insert the test books
    for (const book of testBooks) {
      await DatabaseService.insertDocument(booksCollection, book)
    }
  })

  // Cleanup after all tests
  afterAll(async () => {
    await db.afterAllCallback()
  })

  describe('Search Catalog', () => {
    it('should return all books when no search parameters are provided', async () => {
      const response = await request(app)
        .get('/catalog')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(testBooks.length)
    })

    it('should search books by title (case-insensitive)', async () => {
      const response = await request(app)
        .get('/catalog?title=target')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
      expect(response.body.data.map((book: Book) => book.id)).toEqual(
        expect.arrayContaining(['0515125628', '1234567890']),
      )
    })

    it('should search books by author (case-insensitive)', async () => {
      const response = await request(app)
        .get('/catalog?author=catherine')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
      expect(response.body.data.map((book: Book) => book.author)).toEqual(
        expect.arrayContaining(['Catherine Coulter', 'Catherine Johnson']),
      )
    })

    it('should search books by exact publication year', async () => {
      const response = await request(app)
        .get('/catalog?publicationYear=1999')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
      expect(
        response.body.data.every((book: Book) => book.publicationYear === 1999),
      ).toBe(true)
    })

    it('should combine multiple search parameters with AND logic', async () => {
      const response = await request(app)
        .get('/catalog?title=target&publicationYear=1999')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
      expect(
        response.body.data.every((book: Book) => {
          return (
            book.title.toLowerCase().includes('target') &&
            book.publicationYear === 1999
          )
        }),
      ).toBe(true)
    })

    it('should handle empty search parameters gracefully', async () => {
      const response = await request(app)
        .get('/catalog?title=&author=')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(testBooks.length)
    })

    it('should return an empty array when no books match the criteria', async () => {
      const response = await request(app)
        .get('/catalog?title=nonexistentbook')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(0)
    })

    it('should return 400 for invalid publicationYear parameter', async () => {
      const response = await request(app)
        .get('/catalog?publicationYear=notanumber')
        .set(commonHeaders)
        .expect(400)

      expect(response.body.message[0]).toBe('publicationYear must be number')
    })

    it('should handle white space in search parameters correctly', async () => {
      const response = await request(app)
        .get('/catalog?title=  target  ')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
    })

    it('should handle partial matches in titles', async () => {
      const response = await request(app)
        .get('/catalog?title=evo')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].title).toBe('The Evolution Man')
    })

    it('should handle partial matches in author names', async () => {
      const response = await request(app)
        .get('/catalog?author=lewis')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].author).toBe('Roy Lewis')
    })

    it('should reject invalid query parameters according to schema', async () => {
      // Assuming the schema requires publicationYear to be a number
      const response = await request(app)
        .get('/catalog?publicationYear=invalid')
        .set(commonHeaders)
        .expect(400)

      // The exact error message will depend on your validation implementation
      expect(response.body).toBeDefined()
      // You might need to adjust this expectation based on your error format
      expect(response.body.error || response.body.message).toBeDefined()
    })
  })
})
