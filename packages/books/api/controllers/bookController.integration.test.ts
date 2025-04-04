import { describe, beforeAll, afterAll, it, expect, beforeEach } from 'vitest'
import { setUpTestDatabase } from '@book-library-tool/database/testUtils/setUpTestDatabase.js'
import express from 'express'
import request from 'supertest'
import cors from 'cors'
import { randomUUID } from 'crypto'

// Import the controller
import { BookService } from '../../application/src/use_cases/BookService.js'
import { schemas, validateBody, validateParams } from '@book-library-tool/api'

import { IDatabaseService } from '../../infrastructure/src/database/IDatabaseService.js'
import { BookController } from './bookController.js'
import { BookRepository } from '../../infrastructure/src/persistence/mongo/BookRepository.js'
import { BookRequest } from '@book-library-tool/sdk'

describe('Book Controller Integration Tests', () => {
  // Set up the test database utility
  const dbSetup = setUpTestDatabase({ randomUUID })
  let dbService: IDatabaseService
  let app: express.Express
  let bookController: BookController

  // Common test headers for requests
  const commonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer test-token',
  }

  // Sample book data for testing
  const testBook: BookRequest = {
    isbn: '0515125628',
    title: 'The Target',
    author: 'Catherine Coulter',
    publicationYear: 1999,
    publisher: 'Jove Books',
    price: 27,
  }

  // Setup database and express app before all tests
  beforeAll(async () => {
    // Set up the test environment variables and get the database service
    dbService = await dbSetup.beforeAllCallback()

    // Initialize services and controllers
    const bookRepository = new BookRepository(dbService)
    const bookService = new BookService(bookRepository)
    bookController = new BookController(bookService)

    // Initialize the express application with specific routes
    app = express().disable('x-powered-by').use(cors()).use(express.json())

    // Set up the routes with the controller methods
    app.post(
      '/books',
      validateBody(schemas.BookRequestSchema),
      bookController.createBook,
    )
    app.get(
      '/books/:isbn',
      validateParams(schemas.BookIdSchema),
      bookController.getBook,
    )
    app.delete(
      '/books/:isbn',
      validateParams(schemas.BookIdSchema),
      bookController.deleteBook,
    )
  })

  // Clean the database between tests
  beforeEach(async () => {
    // Clear the books collection to ensure clean state
    await dbSetup.beforeEachCallback()
  })

  // Cleanup after all tests
  afterAll(async () => {
    await dbSetup.afterAllCallback()
  })

  describe('Book CRUD Operations', () => {
    it('should create a new book', async () => {
      const response = await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(testBook)
        .expect(201)

      expect(response.body).toBeDefined()
      expect(response.body.isbn).toBe(testBook.isbn)
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

    it('should retrieve a book by isbn', async () => {
      // First create a book
      await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(testBook)
        .expect(201)

      // Then retrieve it
      const response = await request(app)
        .get(`/books/${testBook.isbn}`)
        .set(commonHeaders)
        .expect(200)

      expect(response.body).toBeDefined()
      expect(response.body.isbn).toBe(testBook.isbn)
      expect(response.body.title).toBe(testBook.title)
      expect(response.body.author).toBe(testBook.author)
    })

    it('should return 404 when book is not found', async () => {
      const response = await request(app)
        .get('/books/nonexistent-isbn')
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
        .delete(`/books/${testBook.isbn}`)
        .set(commonHeaders)
        .expect(200)

      expect(deleteResponse.body.message).toBe('Book deleted successfully.')

      // Verify it's gone
      await request(app)
        .get(`/books/${testBook.isbn}`)
        .set(commonHeaders)
        .expect(404)
    })

    it('should return 404 when trying to delete non-existent book', async () => {
      const response = await request(app)
        .delete('/books/nonexistent-isbn')
        .set(commonHeaders)
        .expect(404)

      expect(response.body.message).toBe('Book not found.')
    })
  })

  describe('Error Handling', () => {
    it('should validate book data on creation', async () => {
      const invalidBook = {
        isbn: '1234567890',
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

    it('should handle domain validation errors', async () => {
      const invalidBook = {
        isbn: '123', // Valid but incomplete data
        title: '', // Empty title should be rejected by domain
        author: 'Test Author',
        publicationYear: 2020,
        publisher: 'Test Publisher',
        price: 15,
      }

      const response = await request(app)
        .post('/books')
        .set(commonHeaders)
        .send(invalidBook)
        .expect(400)

      expect(response.body.error || response.body.message).toBeDefined()
    })
  })
})
