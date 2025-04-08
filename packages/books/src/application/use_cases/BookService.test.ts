import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookRequest } from '@book-library-tool/sdk'
import type { IBookRepository } from '@repositories/IBookRepository.js'
import { BookService } from '@use_cases/BookService.js'
import { Book } from '@entities/Book.js'

// Create a fake repository that implements IBookRepository.
function createFakeBookRepository(): IBookRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findByISBN: vi.fn(),
    deleteByISBN: vi.fn(),
    // update: vi.fn(), // if needed later
  }
}

describe('BookService', () => {
  let fakeBookRepository: IBookRepository
  let bookService: BookService
  let validBookData: BookRequest

  beforeEach(() => {
    fakeBookRepository = createFakeBookRepository()
    bookService = new BookService(fakeBookRepository)

    // Initialize validBookData here (fixed the nested beforeEach)
    validBookData = {
      isbn: '1234567890', // Removed the spaces to avoid trimming issues
      title: 'The Great Adventure',
      author: 'John Doe',
      publicationYear: 2023,
      publisher: 'Publisher Inc.',
      price: 25.5,
    }
  })

  describe('createBook', () => {
    it('should create a new book and call repository.create', async () => {
      const createdBook = await bookService.createBook(validBookData)

      // The created book should be an instance of the domain Book
      expect(createdBook).toBeInstanceOf(Book)
      expect(createdBook.title).toBe(validBookData.title)

      // Verify that the repository.create method was called with the createdBook
      expect(fakeBookRepository.create).toHaveBeenCalledWith(createdBook)
    })

    it('should throw an error if domain invariants fail (empty title)', async () => {
      const data: BookRequest = {
        isbn: '1234567890',
        title: '   ', // empty after trimming
        author: 'Test Author',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 20,
      }

      // Use a more precise approach to match the error message
      await expect(bookService.createBook(data)).rejects.toThrow()

      // Alternatively, you can use a regex matcher that accounts for escape characters
      await expect(bookService.createBook(data)).rejects.toThrow(
        /title.*must match pattern/,
      )
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

    it('should return null if no book is found', async () => {
      vi.spyOn(fakeBookRepository, 'findByISBN').mockResolvedValue(null)

      const result = await bookService.getBookByISBN('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('deleteBookByISBN', () => {
    it('should return true if deletion is successful', async () => {
      vi.spyOn(fakeBookRepository, 'deleteByISBN').mockResolvedValue(true)

      const result = await bookService.deleteBookByISBN('1234567890')

      expect(result).toBe(true)
      expect(fakeBookRepository.deleteByISBN).toHaveBeenCalledWith('1234567890')
    })

    it('should return false if deletion fails', async () => {
      vi.spyOn(fakeBookRepository, 'deleteByISBN').mockResolvedValue(false)

      const result = await bookService.deleteBookByISBN('nonexistent')

      expect(result).toBe(false)
    })
  })
})
