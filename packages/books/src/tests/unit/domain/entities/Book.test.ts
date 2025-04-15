import { Book } from '@entities/Book.js'
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
      // Act
      const { book, event } = Book.create(validBookData)

      // Assert
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
      expect(event.eventType).toBe('BookCreated')
      expect(event.aggregateId).toBe(book.id)
      expect(event.version).toBe(1)
    })

    it('should throw error when ISBN is invalid', () => {
      // Arrange
      const invalidData = {
        ...validBookData,
        isbn: 1234,
      }

      // @ts-expect-error - This is a test for invalid data
      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when title is empty', () => {
      // Arrange
      const invalidData = {
        ...validBookData,
        title: '',
      }

      // Act & Assert
      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when author is empty', () => {
      // Arrange
      const invalidData = {
        ...validBookData,
        author: '',
      }

      // Act & Assert
      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when publication year is invalid', () => {
      // Arrange
      const invalidData = {
        ...validBookData,
        publicationYear: -1,
      }

      // Act & Assert
      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when publisher is empty', () => {
      // Arrange
      const invalidData = {
        ...validBookData,
        publisher: '',
      }

      // Act & Assert
      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })

    it('should throw error when price is invalid', () => {
      // Arrange
      const invalidData = {
        ...validBookData,
        price: -1,
      }

      // Act & Assert
      expect(() => Book.create(invalidData)).toThrow('VALIDATION_ERROR')
    })
  })

  describe('update', () => {
    it('should update book with valid data', () => {
      // Arrange
      const { book: currentBook } = Book.create(validBookData)
      const updateData = {
        title: 'Updated Title',
        author: 'Updated Author',
        publicationYear: 2025,
        publisher: 'Updated Publisher',
        price: 39.99,
      }

      // Act
      const { book: updatedBook, event } = currentBook.update(updateData)

      // Assert
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
      expect(event.eventType).toBe('BookUpdated')
      expect(event.aggregateId).toBe(updatedBook.id)
      expect(event.version).toBe(1)
    })

    it('should throw error when updating with invalid data', () => {
      // Arrange
      const { book: currentBook } = Book.create(validBookData)
      const invalidData = {
        title: '',
      }

      // Act & Assert
      expect(() => currentBook.update(invalidData)).toThrow('VALIDATION_ERROR')
    })
  })

  describe('delete', () => {
    it('should mark book as deleted', () => {
      // Arrange
      const { book: currentBook } = Book.create(validBookData)

      // Act
      const { book, event } = currentBook.delete()

      // Assert
      expect(book.isDeleted()).toBe(true)
      expect(event).toBeDefined()
      expect(event.eventType).toBe('BookDeleted')
      expect(event.aggregateId).toBe(currentBook.id)
      expect(event.version).toBe(1)
    })

    it('should throw error when deleting already deleted book', () => {
      // Arrange
      const { book: currentBook } = Book.create(validBookData)

      const { book: deletedBook } = currentBook.delete()

      // Act & Assert
      expect(() => deletedBook.delete()).toThrow(
        `Book with id ${currentBook.id} is already deleted.`,
      )
    })
  })

  describe('rehydrate', () => {
    it('should rehydrate book from events', () => {
      // Arrange
      const { book: originalBook, event: createdEvent } =
        Book.create(validBookData)

      const updateData = { title: 'Updated Title' }

      const { book: updatedBook, event: updatedEvent } =
        originalBook.update(updateData)

      const { event: deletedEvent } = updatedBook.delete()

      const events = [createdEvent, updatedEvent, deletedEvent]

      // Act
      const rehydratedBook = Book.rehydrate(events)

      // Assert
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
      // Act & Assert
      expect(() => Book.rehydrate([])).toThrow(
        'No events provided to rehydrate the Book aggregate',
      )
    })

    it('should throw error when first event is not BookCreated', () => {
      // Arrange
      const { book: originalBook } = Book.create(validBookData)
      const { event: updatedEvent } = originalBook.update({
        title: 'Updated Title',
      })

      // Act & Assert
      expect(() => Book.rehydrate([updatedEvent])).toThrow(
        'First event must be a BookCreated event',
      )
    })
  })
})
