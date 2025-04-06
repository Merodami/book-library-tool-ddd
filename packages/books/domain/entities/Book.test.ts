import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Book } from './Book.js'

describe('Book entity', () => {
  let validBookData: {
    isbn: string
    title: string
    author: string
    publicationYear: number
    publisher: string
    price: number
  }

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
    const book = new Book(
      validBookData.isbn,
      validBookData.title,
      validBookData.author,
      validBookData.publicationYear,
      validBookData.publisher,
      validBookData.price,
    )

    expect(book.isbn).toBe(validBookData.isbn.trim())
    expect(book.title).toBe(validBookData.title.trim())
    expect(book.author).toBe(validBookData.author.trim())
    expect(book.publicationYear).toBe(validBookData.publicationYear)
    expect(book.publisher).toBe(validBookData.publisher.trim())
    expect(book.price).toBe(validBookData.price)
    expect(book.createdAt).toBeInstanceOf(Date)
    expect(book.updatedAt).toBeInstanceOf(Date)
    expect(book.deletedAt).toBeInstanceOf(Date)
  })

  it('should throw an error if required fields are missing', () => {
    // When isbn is missing or empty, the validateRequiredFields should throw.
    expect(
      () =>
        new Book(
          '',
          validBookData.title,
          validBookData.author,
          validBookData.publicationYear,
          validBookData.publisher,
          validBookData.price,
        ),
    ).toThrowError(/are required/)
  })

  it('should throw an error if any field contains only whitespace', () => {
    // For ISBN
    expect(
      () =>
        new Book(
          '   ',
          validBookData.title,
          validBookData.author,
          validBookData.publicationYear,
          validBookData.publisher,
          validBookData.price,
        ),
    ).toThrowError(/isbn are required and cannot be empty./)
    // For Title
    expect(
      () =>
        new Book(
          validBookData.isbn,
          '   ',
          validBookData.author,
          validBookData.publicationYear,
          validBookData.publisher,
          validBookData.price,
        ),
    ).toThrowError(/title are required and cannot be empty./)
    // For Author
    expect(
      () =>
        new Book(
          validBookData.isbn,
          validBookData.title,
          '   ',
          validBookData.publicationYear,
          validBookData.publisher,
          validBookData.price,
        ),
    ).toThrowError(/author are required and cannot be empty./)
  })

  it('should update the title and update updatedAt timestamp when updateTitle is called', async () => {
    const book = new Book(
      validBookData.isbn,
      validBookData.title,
      validBookData.author,
      validBookData.publicationYear,
      validBookData.publisher,
      validBookData.price,
    )
    const oldUpdatedAt = book.updatedAt

    // Wait a short period to ensure updatedAt changes
    vi.useFakeTimers()
    vi.advanceTimersByTime(10)

    book.updateTitle('  New Title  ')

    expect(book.title).toBe('New Title')
    expect(book.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime())
  })

  it('should throw an error when updateTitle is given an empty string after trimming', () => {
    const book = new Book(
      validBookData.isbn,
      validBookData.title,
      validBookData.author,
      validBookData.publicationYear,
      validBookData.publisher,
      validBookData.price,
    )

    expect(() => book.updateTitle('    ')).toThrowError(
      'newTitle are required and cannot be empty.',
    )
  })
})
