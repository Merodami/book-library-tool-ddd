import {
  Book,
  BookUpdateRequest,
  CatalogSearchQuery,
} from '@book-library-tool/sdk'
import { BookProjectionRepository } from '@books/persistence/mongo/BookProjectionRepository.js'
import { BookDocument } from '@books/persistence/mongo/documents/BookDocument.js'
import { Collection, MongoClient, ObjectId } from 'mongodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('BookProjectionRepository Integration', () => {
  let client: MongoClient
  let collection: Collection<BookDocument>
  let repository: BookProjectionRepository
  let mockBook: Book
  let bookId: string

  // Setup MongoDB connection
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017'
    client = new MongoClient(mongoUri)
    await client.connect()

    // Use a test database
    const db = client.db('book-library-test')
    collection = db.collection<BookDocument>('books')

    repository = new BookProjectionRepository(collection)
  })

  // Cleanup after all tests
  afterAll(async () => {
    await collection.deleteMany({})
    await client.close()
  })

  // Reset data before each test
  beforeEach(async () => {
    // Clear collection
    await collection.deleteMany({})

    // Create test book
    mockBook = {
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 19.99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Insert test book manually
    const result = await collection.insertOne({
      _id: new ObjectId(),
      isbn: mockBook.isbn,
      title: mockBook.title,
      author: mockBook.author,
      publicationYear: mockBook.publicationYear,
      publisher: mockBook.publisher,
      price: mockBook.price,
      createdAt: mockBook.createdAt ? new Date(mockBook.createdAt) : new Date(),
      updatedAt: mockBook.updatedAt ? new Date(mockBook.updatedAt) : new Date(),
    })

    bookId = result.insertedId.toString()
  })

  describe('getBookByISBN', () => {
    it('should return a book when it exists', async () => {
      // Act
      const result = await repository.getBookByISBN(mockBook.isbn)

      // Assert
      expect(result).toBeDefined()
      expect(result?.isbn).toBe(mockBook.isbn)
      expect(result?.title).toBe(mockBook.title)
      expect(result?.author).toBe(mockBook.author)
    })

    it('should return null when book does not exist', async () => {
      // Act
      const result = await repository.getBookByISBN('non-existent-isbn')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('getAllBooks', () => {
    it('should return all books with pagination', async () => {
      // Arrange - Add another book
      const secondBook: Book = {
        isbn: '978-3-16-148410-1',
        title: 'Another Test Book',
        author: 'Another Author',
        publicationYear: 2024,
        publisher: 'Test Publisher',
        price: 29.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await repository.saveProjection(secondBook)

      // Act
      const query: CatalogSearchQuery = {
        page: 1,
        limit: 10,
      }
      const result = await repository.getAllBooks(query)

      // Assert
      expect(result.data.length).toBe(2)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.pages).toBe(1)
      expect(
        result.data.some((book: Book) => book.isbn === mockBook.isbn),
      ).toBe(true)
      expect(
        result.data.some((book: Book) => book.isbn === secondBook.isbn),
      ).toBe(true)
    })

    it('should filter books by title', async () => {
      // Arrange - Add another book
      const secondBook: Book = {
        isbn: '978-3-16-148410-1',
        title: 'Different Title',
        author: 'Another Author',
        publicationYear: 2024,
        publisher: 'Test Publisher',
        price: 29.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await repository.saveProjection(secondBook)

      // Act - Search for "Test" in title
      const query: CatalogSearchQuery = {
        title: 'Test',
        page: 1,
        limit: 10,
      }
      const result = await repository.getAllBooks(query)

      // Assert
      expect(result.data.length).toBe(1)
      expect(result.pagination.total).toBe(1)
      expect(result.data[0].isbn).toBe(mockBook.isbn)
    })
  })

  describe('saveProjection', () => {
    it('should save a new book projection', async () => {
      // Arrange
      const newBook: Book = {
        isbn: '978-3-16-148410-2',
        title: 'New Book',
        author: 'New Author',
        publicationYear: 2025,
        publisher: 'New Publisher',
        price: 39.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Act
      await repository.saveProjection(newBook)

      // Assert - Check if the book was saved
      const savedBook = await repository.getBookByISBN(newBook.isbn)
      expect(savedBook).toBeDefined()
      expect(savedBook?.isbn).toBe(newBook.isbn)
      expect(savedBook?.title).toBe(newBook.title)
      expect(savedBook?.author).toBe(newBook.author)
    })
  })

  describe('updateProjection', () => {
    it('should update an existing book projection', async () => {
      // Arrange
      const updates: BookUpdateRequest = {
        title: 'Updated Title',
        author: 'Updated Author',
      }

      // First get the document to retrieve its ID
      const book = await collection.findOne({ isbn: mockBook.isbn })
      const id = book?._id.toString()

      // Act
      await repository.updateProjection(id!, updates)

      // Assert
      const updatedBook = await repository.getBookByISBN(mockBook.isbn)
      expect(updatedBook).toBeDefined()
      expect(updatedBook?.title).toBe(updates.title)
      expect(updatedBook?.author).toBe(updates.author)
      expect(updatedBook?.isbn).toBe(mockBook.isbn) // ISBN should not change
    })
  })

  describe('markAsDeleted', () => {
    it('should mark a book as deleted', async () => {
      // Arrange
      const timestamp = new Date()

      // First get the document to retrieve its ID
      const book = await collection.findOne({ isbn: mockBook.isbn })
      const id = book?._id.toString()

      // Act
      await repository.markAsDeleted(id!, timestamp)

      // Assert - Book should not be returned in normal queries
      const query: CatalogSearchQuery = {
        page: 1,
        limit: 10,
      }
      const result = await repository.getAllBooks(query)
      expect(result.data.length).toBe(0)

      // Check the database directly to confirm the deletedAt is set
      const markedBook = await collection.findOne({ isbn: mockBook.isbn })
      expect(markedBook).toBeDefined()
      expect(markedBook?.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('findBookForReservation', () => {
    it('should return a book when it exists and is not deleted', async () => {
      // Act
      const result = await repository.findBookForReservation(mockBook.isbn)

      // Assert
      expect(result).toBeDefined()
      expect(result?.isbn).toBe(mockBook.isbn)
    })

    it('should return null when book is deleted', async () => {
      // Arrange
      const timestamp = new Date()

      // First get the document to retrieve its ID
      const book = await collection.findOne({ isbn: mockBook.isbn })
      const id = book?._id.toString()

      // Mark as deleted
      await repository.markAsDeleted(id!, timestamp)

      // Act
      const result = await repository.findBookForReservation(mockBook.isbn)

      // Assert
      expect(result).toBeNull()
    })
  })
})
