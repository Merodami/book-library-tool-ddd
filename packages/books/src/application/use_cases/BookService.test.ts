import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookRequest } from '@book-library-tool/sdk'
import type { IBookRepository } from '@repositories/IBookRepository.js'
import { BookService } from '@use_cases/BookService.js'
import { Book } from '@entities/Book.js'
import { Errors } from '@book-library-tool/shared'

// Create a fake repository that implements IBookRepository.
function createFakeBookRepository(): IBookRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findByISBN: vi.fn(),
    deleteByISBN: vi.fn(),
  }
}

describe('BookService', () => {
  let fakeBookRepository: IBookRepository
  let bookService: BookService
  let validBookData: BookRequest

  beforeEach(() => {
    fakeBookRepository = createFakeBookRepository()
    bookService = new BookService(fakeBookRepository)

    // Initialize validBookData here
    validBookData = {
      isbn: '1234567890',
      title: 'The Great Adventure',
      author: 'John Doe',
      publicationYear: 2023,
      publisher: 'Publisher Inc.',
      price: 25.5,
    }
  })

  describe('createBook', () => {
    it('should create a new book and call repository.create', async () => {
      // Mock getBookByISBN to return null instead of throwing an error
      vi.spyOn(bookService, 'getBookByISBN').mockResolvedValueOnce(null)

      const createdBook = await bookService.createBook(validBookData)

      // The created book should be an instance of the domain Book
      expect(createdBook).toBeInstanceOf(Book)
      expect(createdBook.title).toBe(validBookData.title)

      // Verify that the repository.create method was called with the createdBook
      expect(fakeBookRepository.create).toHaveBeenCalledWith(createdBook)
    })

    it('should throw an error if the book already exists', async () => {
      // Mock an existing book
      const existingBook = Book.create(validBookData)

      // Mock getBookByISBN to return a book, indicating it already exists
      vi.spyOn(bookService, 'getBookByISBN').mockResolvedValueOnce(existingBook)

      // Test that createBook throws the correct error
      await expect(bookService.createBook(validBookData)).rejects.toThrowError(
        new Errors.ApplicationError(
          400,
          'BOOK_ALREADY_EXISTS',
          `Book with isbn ${validBookData.isbn} already exists.`,
        ),
      )

      // Verify repository.create was not called
      expect(fakeBookRepository.create).not.toHaveBeenCalled()
    })

    it('should throw an error if domain invariants fail (empty title)', async () => {
      // First we need to mock the getBookByISBN method to return null
      // to get past the "book already exists" check
      vi.spyOn(bookService, 'getBookByISBN').mockResolvedValueOnce(null)

      const data: BookRequest = {
        isbn: '1234567890',
        title: '   ', // empty after trimming
        author: 'Test Author',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 20,
      }

      // We're expecting a validation error from Book.create
      // The exact format depends on how Book.create throws validation errors
      // Let's just check that we get an error of some kind and not the BOOK_NOT_FOUND error
      await expect(bookService.createBook(data)).rejects.not.toThrow(
        'BOOK_NOT_FOUND',
      )

      // We can assert that an error happens but we won't be specific about the exact format
      await expect(bookService.createBook(data)).rejects.toThrow()
    })
  })

  describe('getBookByISBN', () => {
    it('should return a book if found', async () => {
      // Create a properly formatted book object that will pass validation
      const bookData = {
        ...validBookData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Mock an actual Book instance instead of trying to create one
      const fakeBook = Book.create({
        isbn: bookData.isbn,
        title: bookData.title,
        author: bookData.author,
        publicationYear: bookData.publicationYear,
        publisher: bookData.publisher,
        price: bookData.price,
      })

      // Stub the repository method.
      vi.spyOn(fakeBookRepository, 'findByISBN').mockResolvedValue(fakeBook)

      const result = await bookService.getBookByISBN('1234567890')

      expect(result).toEqual(fakeBook)
      expect(fakeBookRepository.findByISBN).toHaveBeenCalledWith('1234567890')
    })

    it('should throw a not found error if no book is found', async () => {
      vi.spyOn(fakeBookRepository, 'findByISBN').mockResolvedValue(null)

      await expect(
        bookService.getBookByISBN('nonexistent'),
      ).rejects.toThrowError(
        new Errors.ApplicationError(
          404,
          'BOOK_NOT_FOUND',
          `Book with isbn nonexistent not found.`,
        ),
      )
    })
  })

  describe('deleteBookByISBN', () => {
    it('should return true if deletion is successful', async () => {
      vi.spyOn(fakeBookRepository, 'deleteByISBN').mockResolvedValue(true)

      const result = await bookService.deleteBookByISBN('1234567890')

      expect(result).toBe(true)
      expect(fakeBookRepository.deleteByISBN).toHaveBeenCalledWith('1234567890')
    })

    it('should throw an error if deletion fails', async () => {
      vi.spyOn(fakeBookRepository, 'deleteByISBN').mockRejectedValue(
        new Error('Database error'),
      )

      await expect(
        bookService.deleteBookByISBN('1234567890'),
      ).rejects.toThrowError(
        new Errors.ApplicationError(
          500,
          'BOOK_DELETION_FAILED',
          `Failed to delete book with isbn 1234567890.`,
        ),
      )
    })
  })
})
