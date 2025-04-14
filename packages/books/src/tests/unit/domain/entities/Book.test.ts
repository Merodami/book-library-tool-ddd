import { Book, BookProps } from '@books/entities/Book.js'
import { beforeEach, describe, expect, it } from 'vitest'

describe('Book Entity', () => {
  let validBookProps: BookProps

  beforeEach(() => {
    validBookProps = {
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 29.99,
    }
  })

  describe('create', () => {
    it('should create a new book with valid properties', () => {
      const { book, event } = Book.create(validBookProps)

      // Verify book properties
      expect(book).toBeInstanceOf(Book)
      expect(book.isbn).toBe(validBookProps.isbn)
      expect(book.title).toBe(validBookProps.title)
      expect(book.author).toBe(validBookProps.author)
      expect(book.publicationYear).toBe(validBookProps.publicationYear)
      expect(book.publisher).toBe(validBookProps.publisher)
      expect(book.price).toBe(validBookProps.price)
      expect(book.createdAt).toBeInstanceOf(Date)
      expect(book.updatedAt).toBeInstanceOf(Date)
      expect(book.deletedAt).toBeUndefined()

      // Verify event was added to domain events
      expect(book.domainEvents).toContain(event)
    })

    it('should generate a BookCreated event', () => {
      const { event } = Book.create(validBookProps)

      expect(event).toBeDefined()
      expect(event.eventType).toBe('BookCreated')
      expect(event.payload).toEqual({
        ...validBookProps,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })
  })

  describe('update', () => {
    it('should update book properties', async () => {
      const { book: originalBook } = Book.create(validBookProps)
      const updateProps = {
        title: 'Updated Title',
        price: 39.99,
      }

      // Add a small delay to ensure timestamps are different
      await new Promise((resolve) => setTimeout(resolve, 1))

      const { book: updatedBook, event } = originalBook.update(updateProps)

      expect(updatedBook.title).toBe(updateProps.title)
      expect(updatedBook.price).toBe(updateProps.price)
      expect(updatedBook.updatedAt.getTime()).toBeGreaterThan(
        originalBook.updatedAt.getTime(),
      )
      expect(updatedBook.domainEvents).toContain(event)
    })

    it('should generate a BookUpdated event', () => {
      const { book: originalBook } = Book.create(validBookProps)
      const updateProps = {
        title: 'Updated Title',
      }

      const { event } = originalBook.update(updateProps)

      expect(event.eventType).toBe('BookUpdated')
      expect(event.payload.previous.title).toBe(validBookProps.title)
      expect(event.payload.updated.title).toBe(updateProps.title)
    })

    it('should throw error when trying to update a deleted book', () => {
      const { book } = Book.create(validBookProps)
      const { book: deletedBook } = book.delete()

      expect(() => deletedBook.update({ title: 'New Title' })).toThrow(
        'has been deleted',
      )
    })

    it('should throw error when no changes are provided', () => {
      const { book } = Book.create(validBookProps)

      expect(() => book.update({})).toThrow('no changes to apply')
    })
  })

  describe('delete', () => {
    it('should mark book as deleted', () => {
      const { book: originalBook } = Book.create(validBookProps)
      const { book: deletedBook, event } = originalBook.delete()

      expect(deletedBook.deletedAt).toBeInstanceOf(Date)
      expect(deletedBook.isDeleted()).toBe(true)
      expect(deletedBook.domainEvents).toContain(event)
    })

    it('should generate a BookDeleted event', () => {
      const { book } = Book.create(validBookProps)
      const { event } = book.delete()

      expect(event.eventType).toBe('BookDeleted')
      expect(event.payload.deletedAt).toBeDefined()
    })

    it('should throw error when trying to delete an already deleted book', () => {
      const { book } = Book.create(validBookProps)
      const { book: deletedBook } = book.delete()

      expect(() => deletedBook.delete()).toThrow('already deleted')
    })
  })

  describe('rehydrate', () => {
    it('should rehydrate book from events', () => {
      const { book: originalBook, event: createdEvent } =
        Book.create(validBookProps)
      const { event: updatedEvent } = originalBook.update({
        title: 'Updated Title',
      })
      const { event: deletedEvent } = originalBook.delete()

      const rehydratedBook = Book.rehydrate([
        createdEvent,
        updatedEvent,
        deletedEvent,
      ])

      expect(rehydratedBook.id).toBe(originalBook.id)
      expect(rehydratedBook.title).toBe('Updated Title')
      expect(rehydratedBook.isDeleted()).toBe(true)
    })

    it('should throw error when no events are provided', () => {
      expect(() => Book.rehydrate([])).toThrow('No events provided')
    })

    it('should throw error when first event is not BookCreated', () => {
      const { book } = Book.create(validBookProps)
      const { event: updatedEvent } = book.update({ title: 'Updated Title' })

      expect(() => Book.rehydrate([updatedEvent])).toThrow(
        'First event must be a BookCreated event',
      )
    })
  })
})
