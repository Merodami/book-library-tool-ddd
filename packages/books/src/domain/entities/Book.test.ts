import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Book } from '@entities/Book.js'
import { BookRequest } from '@book-library-tool/sdk'

describe('Book entity', () => {
  let validBookData: BookRequest

  beforeEach(() => {
    validBookData = {
      isbn: ' 1234567890 ',
      title: '  The Great Adventure  ',
      author: ' John Doe ',
      publicationYear: 2023,
      publisher: ' Publisher Inc. ',
      price: 25.5,
    }
  })

  it('should create a valid book with trimmed values', () => {
    const book = Book.create(validBookData)

    expect(book.isbn).toBe(validBookData.isbn.trim())
    expect(book.title).toBe(validBookData.title.trim())
    expect(book.author).toBe(validBookData.author.trim())
    expect(book.publicationYear).toBe(validBookData.publicationYear)
    expect(book.publisher).toBe(validBookData.publisher.trim())
    expect(book.price).toBe(validBookData.price)
    expect(book.createdAt).toBeInstanceOf(Date)
    expect(book.updatedAt).toBeInstanceOf(Date)
  })

  it('should throw an error if required fields are missing', () => {
    try {
      // Attempt to create a book with an empty ISBN.
      Book.create({ ...validBookData, isbn: '' })

      throw new Error('Expected validation error not thrown')
    } catch (error: any) {
      // Parse the error message assuming it's JSON-stringified array.
      const errors = JSON.parse(error.message) as string[]

      // Check that one of the errors mentions the ISBN.
      expect(errors.some((msg) => msg.includes('/isbn'))).toBe(true)
    }
  })

  it('should throw an error if any field contains only whitespace', () => {
    // For Title
    try {
      Book.create({ ...validBookData, title: '   ' })

      throw new Error('Expected validation error not thrown')
    } catch (error: any) {
      const errors = JSON.parse(error.message) as string[]

      expect(errors.some((msg) => msg.includes('/title'))).toBe(true)
    }

    // For Author
    try {
      Book.create({ ...validBookData, author: '   ' })

      throw new Error('Expected validation error not thrown')
    } catch (error: any) {
      const errors = JSON.parse(error.message) as string[]

      expect(errors.some((msg) => msg.includes('/author'))).toBe(true)
    }
  })

  it('should update the title and update updatedAt timestamp when updateTitle is called', () => {
    const book = Book.create({ ...validBookData })
    const oldUpdatedAt = book.updatedAt

    vi.useFakeTimers()
    vi.advanceTimersByTime(10)

    book.updateTitle('  New Title  ')

    expect(book.title).toBe('New Title')
    expect(book.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime())

    vi.useRealTimers()
  })

  it('should throw an error when updateTitle is given an empty string after trimming', () => {
    const book = Book.create({ ...validBookData })

    expect(() => book.updateTitle('    ')).toThrowError(
      'newTitle are required and cannot be empty.',
    )
  })
})
