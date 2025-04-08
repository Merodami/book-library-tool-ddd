import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { BookController } from '@controllers/bookController.js'
import { BookService } from '@use_cases/BookService.js'
import { BookRequest } from '@book-library-tool/sdk'
import { Book } from '@entities/Book.js'
import { Errors } from '@book-library-tool/shared'

// Mock the BookService
vi.mock('@use_cases/BookService.js')

describe('BookController', () => {
  let bookController: BookController
  let mockBookService: BookService
  let req: any
  let res: any
  let next: any

  beforeEach(() => {
    // Create mocks for BookService methods
    mockBookService = {
      createBook: vi.fn(),
      getBookByISBN: vi.fn(),
      deleteBookByISBN: vi.fn(),
    } as unknown as BookService

    // Initialize BookController with mock service
    bookController = new BookController(mockBookService)

    // Setup basic Express mocks
    req = {}
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    next = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createBook', () => {
    test('should create a new book and return 201', async () => {
      // Mock input data
      const bookRequest: BookRequest = {
        isbn: '978-3-16-148410-0',
        title: 'Test Book',
        author: 'Test Author',
        publicationYear: 2020,
        publisher: 'Test Publisher',
        price: 29.99,
      }

      // Setup request
      req = { body: bookRequest }

      // Mock created book
      const createdBook = Book.create(bookRequest)
      vi.mocked(mockBookService.createBook).mockResolvedValue(createdBook)

      // Execute
      await bookController.createBook(req, res, next)

      // Verify
      expect(mockBookService.createBook).toHaveBeenCalledWith(bookRequest)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(bookRequest)
    })

    test('should call next with error if an exception occurs', async () => {
      // Mock input data
      const bookRequest: BookRequest = {
        isbn: '978-3-16-148410-0',
        title: 'Test Book',
        author: 'Test Author',
        publicationYear: 2020,
        publisher: 'Test Publisher',
        price: 29.99,
      }

      // Setup request
      req = { body: bookRequest }

      // Setup mock to throw error
      const error = new Errors.ApplicationError(
        400,
        'BOOK_ALREADY_EXISTS',
        `Book with isbn ${bookRequest.isbn} already exists.`,
      )
      vi.mocked(mockBookService.createBook).mockRejectedValue(error)

      // Execute
      await bookController.createBook(req, res, next)

      // Verify
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getBook', () => {
    test('should return 200 with the book if found', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to return a book
      const foundBook = Book.create({
        isbn: '978-3-16-148410-0',
        title: 'Found Book',
        author: 'Found Author',
        publicationYear: 2020,
        publisher: 'Found Publisher',
        price: 29.99,
      })

      vi.mocked(mockBookService.getBookByISBN).mockResolvedValue(foundBook)

      // Execute
      await bookController.getBook(req, res, next)

      // Verify
      expect(mockBookService.getBookByISBN).toHaveBeenCalledWith(
        '978-3-16-148410-0',
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(foundBook)
    })

    test('should call next with error if book is not found', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to throw not found error
      const error = new Errors.ApplicationError(
        404,
        'BOOK_NOT_FOUND',
        `Book with isbn ${req.params.isbn} not found.`,
      )
      vi.mocked(mockBookService.getBookByISBN).mockRejectedValue(error)

      // Execute
      await bookController.getBook(req, res, next)

      // Verify
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    test('should call next with error if an exception occurs', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to throw error
      const error = new Error('Test error')
      vi.mocked(mockBookService.getBookByISBN).mockRejectedValue(error)

      // Execute
      await bookController.getBook(req, res, next)

      // Verify
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('deleteBook', () => {
    test('should return 200 when the book is deleted successfully', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to simulate successful deletion
      vi.mocked(mockBookService.deleteBookByISBN).mockResolvedValue(true)

      // Execute
      await bookController.deleteBook(req, res, next)

      // Verify
      expect(mockBookService.deleteBookByISBN).toHaveBeenCalledWith(
        '978-3-16-148410-0',
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Book deleted successfully.',
      })
    })

    test('should call next with error if deletion fails', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to throw error
      const error = new Errors.ApplicationError(
        500,
        'BOOK_DELETION_FAILED',
        `Failed to delete book with isbn ${req.params.isbn}.`,
      )

      vi.mocked(mockBookService.deleteBookByISBN).mockRejectedValue(error)

      // Execute
      await bookController.deleteBook(req, res, next)

      // Verify
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })
})
