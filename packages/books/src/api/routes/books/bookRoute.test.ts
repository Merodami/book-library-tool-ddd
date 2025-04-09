import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookController } from '@controllers/bookController.js'
import { BookCreateRequest } from '@book-library-tool/sdk'
import { schemas, validateBody, validateParams } from '@book-library-tool/api'
import { errorMiddleware, Errors } from '@book-library-tool/shared'

// Create a fake BookService with stubbed methods.
class FakeBookService {
  getBookByISBN = vi.fn()
  createBook = vi.fn()
  deleteBookByISBN = vi.fn()
}

describe('BookController Routes', () => {
  let fakeBookService: FakeBookService
  let bookController: BookController
  let app: express.Express

  beforeEach(() => {
    // Instantiate the fake service and inject it into the controller.
    fakeBookService = new FakeBookService()
    bookController = new BookController(fakeBookService as unknown as any)
    app = express()
    app.use(express.json())

    // Create a router and mount the controller methods.
    const router = express.Router()
    router.post(
      '/',
      validateBody(schemas.BookCreateRequestSchema),
      bookController.createBook,
    )
    router.get(
      '/:isbn',
      validateParams(schemas.BookIdSchema),
      bookController.getBook,
    )
    router.delete(
      '/:isbn',
      validateParams(schemas.BookIdSchema),
      bookController.deleteBook,
    )
    app.use('/books', router)

    app.use(errorMiddleware)
  })

  describe('POST /books', () => {
    it('should return 400 if request body is invalid', async () => {
      // Missing required fields (e.g., isbn is missing)
      const invalidBody = { title: 'Test Book', author: 'Tester' }

      const { body } = await request(app).post('/books').send(invalidBody)

      expect(body.status).toBe(400)

      expect(fakeBookService.createBook).not.toHaveBeenCalled()

      // It must forward the correct error to next()
      expect(body).toStrictEqual(
        expect.objectContaining({
          status: 400,
          message: 'VALIDATION_ERROR',
          content: [
            "data must have required property 'isbn'",
            "data must have required property 'publicationYear'",
            "data must have required property 'publisher'",
            "data must have required property 'price'",
          ],
        } as Partial<Errors.ApplicationError>),
      )
    })

    it('should create a new book and return 201 for valid input', async () => {
      const validBody: BookCreateRequest = {
        isbn: '1234567890',
        title: 'Test Book',
        author: 'Tester',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 20,
      }

      // Stub getBookByISBN to return null (i.e. book does not exist yet)
      fakeBookService.getBookByISBN.mockResolvedValue(null)
      // Stub createBook to resolve without error
      fakeBookService.createBook.mockResolvedValue(validBody)

      const response = await request(app).post('/books').send(validBody)

      expect(response.status).toBe(201)
      expect(response.body.message).toBeUndefined() // Our fake controller returns the book directly
      expect(response.body).toEqual(validBody)
      expect(fakeBookService.createBook).toHaveBeenCalledWith(validBody)
    })
  })

  describe('GET /books/:isbn', () => {
    it('should return 404 if isbn parameter is invalid', async () => {
      // Simulate an invalid ISBN (e.g., empty string after trimming)
      const response = await request(app).get('/books/   ')

      expect(response.status).toBe(404)
    })

    it('should get a book and return 200 for a valid isbn', async () => {
      const isbn = '1234567890'

      // Stub getBookByISBN to return a fake book.
      fakeBookService.getBookByISBN.mockResolvedValue({
        isbn,
        title: 'Test Book',
      })

      const response = await request(app).get(`/books/${isbn}`)

      expect(response.status).toBe(200)
      expect(fakeBookService.getBookByISBN).toHaveBeenCalled()
    })
  })

  describe('DELETE /books/:isbn', () => {
    it('should return 404 if isbn parameter is invalid', async () => {
      const response = await request(app).delete('/books/   ')

      expect(response.status).toBe(404)
    })

    it('should delete a book and return 200 for a valid isbn', async () => {
      const isbn = '1234567890'
      // Stub deleteBookByISBN to return true.
      fakeBookService.deleteBookByISBN.mockResolvedValue(true)

      const response = await request(app).delete(`/books/${isbn}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Book deleted successfully.')
      expect(fakeBookService.deleteBookByISBN).toHaveBeenCalledWith(isbn)
    })
  })
})
