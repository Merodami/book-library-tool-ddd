import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { BookController } from '@controllers/bookController.js'
import { BookService } from '@use_cases/BookService.js'
import { BookRequest } from '@book-library-tool/sdk'
import { Book } from '@entities/Book.js'

// Mock the BookService
vi.mock('../application/use_cases/BookService.js')

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
    test('should return 400 if the book already exists', async () => {
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

      // Setup mock to simulate book already exists
      const existingBook = new Book(
        bookRequest.isbn,
        bookRequest.title,
        bookRequest.author,
        bookRequest.publicationYear,
        bookRequest.publisher,
        bookRequest.price,
      )

      vi.mocked(mockBookService.getBookByISBN).mockResolvedValue(existingBook)

      // Execute
      await bookController.createBook(req, res, next)

      // Verify
      expect(mockBookService.getBookByISBN).toHaveBeenCalledWith(
        bookRequest.isbn,
      )
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Book with provided ID already exists.',
      })
      expect(mockBookService.createBook).not.toHaveBeenCalled()
    })

    test('should create a new book and return 201 when book does not exist', async () => {
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

      // Setup mock to simulate book doesn't exist
      vi.mocked(mockBookService.getBookByISBN).mockResolvedValue(null)

      // Mock created book
      const createdBook = new Book(
        bookRequest.isbn,
        bookRequest.title,
        bookRequest.author,
        bookRequest.publicationYear,
        bookRequest.publisher,
        bookRequest.price,
      )
      vi.mocked(mockBookService.createBook).mockResolvedValue(createdBook)

      // Execute
      await bookController.createBook(req, res, next)

      // Verify
      expect(mockBookService.getBookByISBN).toHaveBeenCalledWith(
        bookRequest.isbn,
      )
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
      const error = new Error('Test error')
      vi.mocked(mockBookService.getBookByISBN).mockRejectedValue(error)

      // Execute
      await bookController.createBook(req, res, next)

      // Verify
      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getBook', () => {
    test('should return 404 if the book is not found', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to simulate book not found
      vi.mocked(mockBookService.getBookByISBN).mockResolvedValue(null)

      // Execute
      await bookController.getBook(req, res, next)

      // Verify
      expect(mockBookService.getBookByISBN).toHaveBeenCalledWith(
        '978-3-16-148410-0',
      )
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Book not found.' })
    })

    test('should return 200 with the book if found', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to return a book
      const foundBook = new Book(
        '978-3-16-148410-0',
        'Found Book',
        'Found Author',
        2020,
        'Found Publisher',
        29.99,
      )
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
    test('should return 404 if the book is not found for deletion', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to simulate book not found
      vi.mocked(mockBookService.deleteBookByISBN).mockResolvedValue(false)

      // Execute
      await bookController.deleteBook(req, res, next)

      // Verify
      expect(mockBookService.deleteBookByISBN).toHaveBeenCalledWith(
        '978-3-16-148410-0',
      )
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Book not found.' })
    })

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

    test('should call next with error if an exception occurs', async () => {
      // Setup request
      req = { params: { isbn: '978-3-16-148410-0' } }

      // Setup mock to throw error
      const error = new Error('Test error')
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
