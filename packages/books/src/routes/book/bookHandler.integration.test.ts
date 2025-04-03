import { describe, beforeAll, afterAll, it, expect, beforeEach } from 'vitest'
import { setUpTestDatabase } from '@book-library-tool/database/src/testUtils/setUpTestDatabase.js'
import express from 'express'
import request from 'supertest'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { DatabaseService } from '@book-library-tool/database'

// Import the handler directly instead of the router
import { bookHandler } from './bookHandler.js'
import { catalogHandler } from '../catalog/catalogHandler.js'
import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import { paginationMiddleware } from '@book-library-tool/sdk'

describe('Book Service Integration Tests', () => {
  const db = setUpTestDatabase({ randomUUID })
  let app: express.Express

  // Common test headers for requests
  const commonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer test-token',
  }

  // Sample book data for testing
  const testBook = {
    id: '0515125628',
    title: 'The Target',
    author: 'Catherine Coulter',
    publicationYear: 1999,
    publisher: 'Jove Books',
    price: 27,
  }

  // Setup database and express app before all tests
  beforeAll(async () => {
    // Set up the test environment variables
    await db.beforeAllCallback()

    // Explicitly connect to the database
    await DatabaseService.connect()

    // Initialize the express application with specific routes
    // Instead of using the router, directly map routes to handlers
    app = express().disable('x-powered-by').use(cors()).use(express.json())

    // Explicitly define the routes using the handlers
    app.post('/books', validateBody(schemas.BookSchema), bookHandler.createBook)
    app.get(
      '/books/:referenceId',
      validateParams(schemas.BookIdSchema),
      bookHandler.getBook,
    )
    app.delete(
      '/books/:referenceId',
      validateParams(schemas.BookIdSchema),
      bookHandler.deleteBook,
    )
    // To validate if book created exists

    app.get('/catalog', paginationMiddleware(), catalogHandler.searchCatalog)
  })

  // Clean the database between tests
  beforeEach(async () => {
    // Clear the books collection to ensure clean state
    await db.beforeEachCallback()
  })

  // Cleanup after all tests
  afterAll(async () => {
    await db.afterAllCallback()
  })

  describe('Book CRUD Operations', () => {
    it('should create a new book', async () => {
      const response = await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(testBook)
        .expect(201)

      expect(response.body).toBeDefined()
      expect(response.body.id).toBe(testBook.id)
      expect(response.body.title).toBe(testBook.title)
      expect(response.body.author).toBe(testBook.author)
    })

    it('should not create a duplicate book', async () => {
      // First create a book
      await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(testBook)
        .expect(201)

      // Try to create the same book again
      const response = await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(testBook)
        .expect(400)

      expect(response.body.message).toBe(
        'Book with provided ID already exists.',
      )
    })

    it('should retrieve a book by id', async () => {
      // First create a book
      await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(testBook)
        .expect(201)

      // Then retrieve it
      const response = await request(app)
        .get(`/books/${testBook.id}`)
        .set(commonHeaders)
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.id).toBe(testBook.id)
      expect(response.body.title).toBe(testBook.title)
      expect(response.body.author).toBe(testBook.author)
    })

    it('should return 404 when book is not found', async () => {
      const response = await request(app)
        .get('/books/nonexistent-id')
        .set(commonHeaders)
        .expect(404)

      expect(response.body.message).toBe('Book not found.')
    })

    it('should delete a book', async () => {
      // First create a book
      await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(testBook)
        .expect(201)

      // Then delete it
      const deleteResponse = await request(app)
        .delete(`/books/${testBook.id}`)
        .set(commonHeaders)
        .expect(200)

      expect(deleteResponse.body.message).toBe('Book deleted successfully.')

      // Verify it's gone
      await request(app)
        .get(`/books/${testBook.id}`)
        .set(commonHeaders)
        .expect(404)
    })

    it('should return 404 when trying to delete non-existent book', async () => {
      const response = await request(app)
        .delete('/books/nonexistent-id')
        .set(commonHeaders)
        .expect(404)

      expect(response.body.message).toBe('Book not found.')
    })
  })

  describe('Catalog Search', () => {
    // Prepare sample books for search tests
    const books = [
      testBook,
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
        title: 'Another Target',
        author: 'Some Writer',
        publicationYear: 1999,
        publisher: 'Test Publisher',
        price: 30,
      },
    ]

    beforeEach(async () => {
      // Create all sample books for search tests
      for (const book of books) {
        await request(app).post('/books').set(commonHeaders).send(book)
      }
    })

    it('should search books by title', async () => {
      const response = await request(app)
        .get('/catalog?title=Target')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
      expect(response.body.data.map((b: any) => b.title)).toEqual(
        expect.arrayContaining(['The Target', 'Another Target']),
      )
    })

    it('should search books by author', async () => {
      const response = await request(app)
        .get('/catalog?author=Coulter')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].author).toBe('Catherine Coulter')
    })

    it('should search books by publication year', async () => {
      const response = await request(app)
        .get('/catalog?publicationYear=1999')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(2)
      expect(response.body.data.map((b: any) => b.publicationYear)).toEqual([
        1999, 1999,
      ])
    })

    it('should return an empty array when no books match search criteria', async () => {
      const response = await request(app)
        .get('/catalog?title=NonexistentTitle')
        .set(commonHeaders)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should validate book data on creation', async () => {
      const invalidBook = {
        id: '1234567890',
        // Missing required fields: title, author
        publicationYear: 'not-a-number', // Invalid type
        publisher: 'Test Publisher',
        price: 30,
      }

      const response = await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(invalidBook)
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })
})
