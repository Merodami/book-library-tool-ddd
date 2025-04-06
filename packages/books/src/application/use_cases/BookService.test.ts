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

  beforeEach(() => {
    fakeBookRepository = createFakeBookRepository()
    bookService = new BookService(fakeBookRepository)
  })

  describe('createBook', () => {
    it('should create a new book and call repository.create', async () => {
      const data: BookRequest = {
        isbn: '1234567890',
        title: 'Test Book',
        author: 'Test Author',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 20,
      }

      const createdBook = await bookService.createBook(data)

      // The created book should be an instance of the domain Book
      expect(createdBook).toBeInstanceOf(Book)
      expect(createdBook.title).toBe(data.title)

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

      await expect(bookService.createBook(data)).rejects.toThrowError(
        'title are required and cannot be empty.',
      )
    })
  })

  describe('getBookByISBN', () => {
    it('should return a book if found', async () => {
      const fakeBook = new Book(
        '1234567890',
        'Test Book',
        'Test Author',
        2023,
        'Test Publisher',
        20,
      )

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
