import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { bookHandler } from './bookHandler.js'
import { DatabaseService } from '@book-library-tool/database'
import type { Book } from '@book-library-tool/sdk'
import { ObjectId } from 'bson'

// Mock the DatabaseService module.
vi.mock('@book-library-tool/database', () => ({
  DatabaseService: {
    connect: vi.fn(),
    getCollection: vi.fn(),
    findOne: vi.fn(),
    insertDocument: vi.fn(),
  },
}))

describe('bookHandler', () => {
  let fakeBooksCollection: any
  let req: any
  let res: any
  let next: any

  beforeEach(() => {
    // Create a fake books collection with a mocked deleteOne method.
    fakeBooksCollection = {
      deleteOne: vi.fn(),
    }

    // Stub DatabaseService.getCollection to return our fakeBooksCollection.
    vi.spyOn(DatabaseService, 'getCollection').mockReturnValue(
      fakeBooksCollection,
    )

    // Setup basic Express mocks.
    req = {}
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    next = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createBook', () => {
    test('should return 400 if the book already exists', async () => {
      // Simulate that the book already exists.
      ;(DatabaseService.findOne as any).mockResolvedValue({ id: 'book1' })

      req = {
        body: {
          id: ' book1 ',
          title: 'Test Title',
          author: 'Test Author',
          publicationYear: 2020,
          publisher: 'Test Publisher',
          price: 25,
        },
      }

      await bookHandler.createBook(req, res, next)

      expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')
      // Expect findOne to be called with the trimmed id.
      expect(DatabaseService.findOne).toHaveBeenCalledWith(
        fakeBooksCollection,
        { id: 'book1' },
      )
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Book with provided ID already exists.',
      })
    })

    test('should create a new book reference and return 201', async () => {
      // Simulate that no book exists.
      ;(DatabaseService.findOne as any).mockResolvedValue(null)
      // Return a dummy InsertOneResult.
      const dummyInsertResult = {
        acknowledged: true,
        insertedId: new ObjectId(),
      }
      vi.spyOn(DatabaseService, 'insertDocument').mockResolvedValue(
        dummyInsertResult,
      )

      req = {
        body: {
          id: ' book2 ',
          title: 'Test Title 2',
          author: 'Test Author 2',
          publicationYear: 2021,
          publisher: 'Test Publisher 2',
          price: 30,
        },
      }

      await bookHandler.createBook(req, res, next)

      expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')
      expect(DatabaseService.findOne).toHaveBeenCalledWith(
        fakeBooksCollection,
        { id: 'book2' },
      )
      expect(DatabaseService.insertDocument).toHaveBeenCalled()

      // Extract the book object passed to insertDocument.
      const insertedBook = (DatabaseService.insertDocument as any).mock
        .calls[0][1] as Book & { createdAt: string; updatedAt: string }

      // Expect trimmed values.
      expect(insertedBook.id).toBe('book2')
      expect(insertedBook.title).toBe('Test Title 2')
      expect(insertedBook.author).toBe('Test Author 2')
      expect(insertedBook.publicationYear).toBe(2021)
      expect(insertedBook.publisher).toBe('Test Publisher 2')
      expect(insertedBook.price).toBe(30)
      // Since the handler does not add timestamps, these should be undefined.
      expect(insertedBook.createdAt).toBeUndefined()
      expect(insertedBook.updatedAt).toBeUndefined()

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(insertedBook)
    })

    test('should call next with error if an exception occurs in createBook', async () => {
      const validationError = new Error('Validation error')
      // Override findOne to throw an error.
      ;(DatabaseService.findOne as any).mockImplementation(() => {
        throw validationError
      })

      req = {
        body: {
          id: 'invalid-id',
          title: 'Test Title',
          author: 'Test Author',
          publicationYear: 2022,
          publisher: 'Test Publisher',
          price: 40,
        },
      }

      await bookHandler.createBook(req, res, next)
      expect(next).toHaveBeenCalledWith(validationError)
    })
  })

  describe('getBook', () => {
    test('should return 404 if the book is not found', async () => {
      ;(DatabaseService.findOne as any).mockResolvedValue(null)
      req = { params: { referenceId: 'ref1' } }

      await bookHandler.getBook(req, res, next)

      expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')
      expect(DatabaseService.findOne).toHaveBeenCalledWith(
        fakeBooksCollection,
        { id: 'ref1' },
      )
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Book not found.' })
    })

    test('should return 200 with the book if found', async () => {
      const foundBook: Book = {
        id: 'book3',
        title: 'Found Book',
        author: 'Author',
        publicationYear: 2022,
        publisher: 'Publisher',
        price: 50,
      }
      ;(DatabaseService.findOne as any).mockResolvedValue(foundBook)

      req = { params: { referenceId: 'ref3' } }

      await bookHandler.getBook(req, res, next)

      expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')
      expect(DatabaseService.findOne).toHaveBeenCalledWith(
        fakeBooksCollection,
        { id: 'ref3' },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(foundBook)
    })
  })

  describe('deleteBook', () => {
    test('should return 404 if the book is not found for deletion', async () => {
      fakeBooksCollection.deleteOne.mockResolvedValue({ deletedCount: 0 })
      req = { params: { referenceId: 'ref4' } }

      await bookHandler.deleteBook(req, res, next)

      expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')
      expect(fakeBooksCollection.deleteOne).toHaveBeenCalledWith({ id: 'ref4' })
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Book not found.' })
    })

    test('should return 200 when the book is deleted successfully', async () => {
      fakeBooksCollection.deleteOne.mockResolvedValue({ deletedCount: 1 })
      req = { params: { referenceId: 'ref5' } }

      await bookHandler.deleteBook(req, res, next)

      expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')
      expect(fakeBooksCollection.deleteOne).toHaveBeenCalledWith({ id: 'ref5' })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Book deleted successfully.',
      })
    })
  })
})
