import {
  BOOK_CREATED,
  BOOK_DELETED,
  BOOK_UPDATED,
} from '@book-library-tool/event-store'
import { Book } from '@books/domain/index.js'
import { describe, expect, it } from 'vitest'

describe('Book', () => {
  const validBookData = {
    isbn: '978-3-16-148410-0',
    title: 'Test Book',
    author: 'Test Author',
    publicationYear: 2024,
    publisher: 'Test Publisher',
    price: 29.99,
  }

  describe('create', () => {
    it('should create a new book with valid data', () => {
      const { book, event } = Book.create(validBookData)

      expect(book).toBeInstanceOf(Book)
      expect(book.isbn).toBe(validBookData.isbn)
      expect(book.title).toBe(validBookData.title)
      expect(book.author).toBe(validBookData.author)
      expect(book.publicationYear).toBe(validBookData.publicationYear)
      expect(book.publisher).toBe(validBookData.publisher)
      expect(book.price).toBe(validBookData.price)
      expect(book.version).toBe(0)
      expect(book.isDeleted()).toBe(false)

      expect(event).toBeDefined()
      expect(event.eventType).toBe(BOOK_CREATED)
      expect(event.aggregateId).toBe(book.id)
      expect(event.version).toBe(1)
    })

    it('should throw error when ISBN is invalid', () => {
      const invalidData = {
        ...validBookData,
        isbn: 1234,
      }

      // @ts-expect-error - This is a test for invalid data
      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when title is empty', () => {
      const invalidData = {
        ...validBookData,
        title: '',
      }

      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when author is empty', () => {
      const invalidData = {
        ...validBookData,
        author: '',
      }

      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when publication year is invalid', () => {
      const invalidData = {
        ...validBookData,
        publicationYear: -1,
      }

      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when publisher is empty', () => {
      const invalidData = {
        ...validBookData,
        publisher: '',
      }

      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when price is invalid', () => {
      const invalidData = {
        ...validBookData,
        price: -1,
      }

      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })
  })

  describe('update', () => {
    it('should update book with valid data', () => {
      const { book: currentBook } = Book.create(validBookData)
      const updateData = {
        title: 'Updated Title',
        author: 'Updated Author',
        publicationYear: 2025,
        publisher: 'Updated Publisher',
        price: 39.99,
      }

      const { book: updatedBook, event } = currentBook.update(updateData)

      expect(updatedBook).toBeInstanceOf(Book)
      expect(updatedBook.isbn).toBe(validBookData.isbn)
      expect(updatedBook.title).toBe(updateData.title)
      expect(updatedBook.author).toBe(updateData.author)
      expect(updatedBook.publicationYear).toBe(updateData.publicationYear)
      expect(updatedBook.publisher).toBe(updateData.publisher)
      expect(updatedBook.price).toBe(updateData.price)
      expect(updatedBook.version).toBe(1)
      expect(updatedBook.isDeleted()).toBe(false)

      expect(event).toBeDefined()
      expect(event.eventType).toBe(BOOK_UPDATED)
      expect(event.aggregateId).toBe(updatedBook.id)
      expect(event.version).toBe(1)
    })

    it('should throw error when updating with invalid data', () => {
      const { book: currentBook } = Book.create(validBookData)
      const invalidData = {
        title: '',
      }

      expect(() => currentBook.update(invalidData)).toThrow('VALIDATION_ERROR')
    })
  })

  describe('delete', () => {
    it('should mark book as deleted', () => {
      const { book: currentBook } = Book.create(validBookData)

      const { book, event } = currentBook.delete()

      expect(book.isDeleted()).toBe(true)
      expect(event).toBeDefined()
      expect(event.eventType).toBe(BOOK_DELETED)
      expect(event.aggregateId).toBe(currentBook.id)
      expect(event.version).toBe(1)
    })

    it('should throw error when deleting already deleted book', () => {
      const { book: currentBook } = Book.create(validBookData)

      const { book: deletedBook } = currentBook.delete()

      expect(() => deletedBook.delete()).toThrow(
        `Book with ID ${currentBook.id} is already deleted.`,
      )
    })
  })

  describe('rehydrate', () => {
    it('should rehydrate book from events', () => {
      const { book: originalBook, event: createdEvent } =
        Book.create(validBookData)

      const updateData = { title: 'Updated Title' }

      const { book: updatedBook, event: updatedEvent } =
        originalBook.update(updateData)

      const { event: deletedEvent } = updatedBook.delete()

      const events = [createdEvent, updatedEvent, deletedEvent]

      const rehydratedBook = Book.rehydrate(events)

      expect(rehydratedBook).toBeInstanceOf(Book)
      expect(rehydratedBook.isbn).toBe(validBookData.isbn)
      expect(rehydratedBook.title).toBe(updateData.title)
      expect(rehydratedBook.author).toBe(validBookData.author)
      expect(rehydratedBook.publicationYear).toBe(validBookData.publicationYear)
      expect(rehydratedBook.publisher).toBe(validBookData.publisher)
      expect(rehydratedBook.price).toBe(validBookData.price)
      expect(rehydratedBook.version).toBe(2)
      expect(rehydratedBook.isDeleted()).toBe(true)
    })

    it('should throw error when rehydrating with empty events', () => {
      expect(() => Book.rehydrate([])).toThrow(
        'No events provided to rehydrate the Book aggregate',
      )
    })

    it('should throw error when first event is not BookCreated', () => {
      const { book: originalBook } = Book.create(validBookData)
      const { event: updatedEvent } = originalBook.update({
        title: 'Updated Title',
      })

      expect(() => Book.rehydrate([updatedEvent])).toThrow(
        'First event must be a BookCreated event',
      )
    })
  })
})
