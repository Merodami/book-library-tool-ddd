import {
  Book,
  BookUpdateRequest,
  CatalogSearchQuery,
} from '@book-library-tool/sdk'
import { BookProjectionRepository } from '@books/persistence/mongo/BookProjectionRepository.js'
import { BookDocument } from '@books/persistence/mongo/documents/BookDocument.js'
import { Collection, ObjectId } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('BookProjectionRepository', () => {
  // Define a properly typed mock collection for Vitest
  let mockCollection: {
    find: ReturnType<typeof vi.fn>
    findOne: ReturnType<typeof vi.fn>
    insertOne: ReturnType<typeof vi.fn>
    updateOne: ReturnType<typeof vi.fn>
    countDocuments: ReturnType<typeof vi.fn>
    project: ReturnType<typeof vi.fn>
    skip: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
    sort: ReturnType<typeof vi.fn>
    toArray: ReturnType<typeof vi.fn>
  } & Partial<Collection<BookDocument>>
  let repository: BookProjectionRepository
  let mockBook: Book
  let mockDocument: BookDocument

  beforeEach(() => {
    // Create a domain model Book with string dates (ISO format)
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

    // Create a MongoDB document with native Date objects
    mockDocument = {
      _id: new ObjectId(),
      isbn: mockBook.isbn,
      title: mockBook.title,
      author: mockBook.author,
      publicationYear: mockBook.publicationYear,
      publisher: mockBook.publisher,
      price: mockBook.price,
      createdAt: mockBook.createdAt ? new Date(mockBook.createdAt) : new Date(),
      updatedAt: mockBook.updatedAt ? new Date(mockBook.updatedAt) : new Date(),
    }

    // Mock the MongoDB collection
    mockCollection = {
      find: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockResolvedValue(mockDocument),
      insertOne: vi.fn().mockResolvedValue({ insertedId: mockDocument._id }),
      updateOne: vi
        .fn()
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
      countDocuments: vi.fn().mockResolvedValue(1),
      project: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([mockDocument]),
    }

    repository = new BookProjectionRepository(
      mockCollection as Collection<BookDocument>,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getBookByISBN', () => {
    it('should return a book when it exists', async () => {
      // Act
      const result = await repository.getBookByISBN(mockBook.isbn)

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          isbn: mockBook.isbn,
          title: mockBook.title,
          author: mockBook.author,
          publicationYear: mockBook.publicationYear,
          publisher: mockBook.publisher,
          price: mockBook.price,
        }),
      )
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { isbn: mockBook.isbn, deletedAt: { $exists: false } },
        { projection: { _id: 0 } },
      )
    })

    it('should return null when book does not exist', async () => {
      // Arrange
      mockCollection.findOne = vi.fn().mockResolvedValue(null)

      // Act
      const result = await repository.getBookByISBN('non-existent-isbn')

      // Assert
      expect(result).toBeNull()
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { isbn: 'non-existent-isbn', deletedAt: { $exists: false } },
        { projection: { _id: 0 } },
      )
    })

    it('should apply field projection when fields are specified', async () => {
      // Arrange
      const fields = ['title', 'author']

      // Act
      await repository.getBookByISBN(mockBook.isbn, fields)

      // Assert
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { isbn: mockBook.isbn, deletedAt: { $exists: false } },
        { projection: { title: 1, author: 1 } },
      )
    })
  })

  describe('getAllBooks', () => {
    it('should return paginated books', async () => {
      // Arrange
      const query: CatalogSearchQuery = {
        page: 1,
        limit: 10,
      }

      // Act
      const result = await repository.getAllBooks(query)

      // Assert
      expect(result).toEqual({
        data: [
          expect.objectContaining({
            isbn: mockBook.isbn,
            title: mockBook.title,
          }),
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })
      expect(mockCollection.countDocuments).toHaveBeenCalled()
      expect(mockCollection.find).toHaveBeenCalledWith({
        deletedAt: { $exists: false },
      })
    })

    it('should apply text search filters', async () => {
      // Arrange
      const query: CatalogSearchQuery = {
        title: 'Test',
        author: 'Author',
        publisher: 'Publisher',
        page: 1,
        limit: 10,
      }

      // Act
      await repository.getAllBooks(query)

      // Assert
      expect(mockCollection.find).toHaveBeenCalledWith({
        deletedAt: { $exists: false },
        title: { $regex: 'Test', $options: 'i' },
        author: { $regex: 'Author', $options: 'i' },
        publisher: { $regex: 'Publisher', $options: 'i' },
      })
    })

    it('should apply ISBN exact match filter', async () => {
      // Arrange
      const query: CatalogSearchQuery = {
        isbn: '978-3-16-148410-0',
        page: 1,
        limit: 10,
      }

      // Act
      await repository.getAllBooks(query)

      // Assert
      expect(mockCollection.find).toHaveBeenCalledWith({
        deletedAt: { $exists: false },
        isbn: '978-3-16-148410-0',
      })
    })

    it('should apply numeric range filters', async () => {
      // Arrange
      const query: CatalogSearchQuery = {
        publicationYearMin: 2000,
        publicationYearMax: 2023,
        priceMin: 10,
        priceMax: 50,
        page: 1,
        limit: 10,
      }

      // Act
      await repository.getAllBooks(query)

      // Assert
      expect(mockCollection.find).toHaveBeenCalledWith({
        deletedAt: { $exists: false },
        publicationYear: { $gte: 2000, $lte: 2023 },
        price: { $gte: 10, $lte: 50 },
      })
    })

    it('should apply sorting', async () => {
      // Arrange
      const query: CatalogSearchQuery = {
        page: 1,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'ASC',
      }

      // Act
      await repository.getAllBooks(query)

      // Assert
      expect(mockCollection.sort).toHaveBeenCalledWith({ title: 1 })
    })
  })

  describe('saveProjection', () => {
    it('should save a new book projection', async () => {
      // Act
      await repository.saveProjection(mockBook)

      // Assert
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          isbn: mockBook.isbn,
          title: mockBook.title,
          author: mockBook.author,
          publicationYear: mockBook.publicationYear,
          publisher: mockBook.publisher,
          price: mockBook.price,
          _id: expect.any(ObjectId),
          createdAt: expect.any(Date), // Verify Date object, not string
          updatedAt: expect.any(Date), // Verify Date object, not string
        }),
      )
    })
  })

  describe('updateProjection', () => {
    it('should update an existing book projection', async () => {
      // Arrange
      const id = mockDocument._id.toString()
      const updates: BookUpdateRequest = {
        title: 'Updated Title',
        author: 'Updated Author',
      }

      // Act
      await repository.updateProjection(id, updates)

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        {
          $set: {
            ...updates,
            updatedAt: expect.any(Date),
          },
        },
      )
    })

    it('should convert string dates to Date objects when updating', async () => {
      // Arrange
      const id = mockDocument._id.toString()
      const dateStr = '2023-04-01T12:00:00.000Z'
      const updates = {
        title: 'Updated Title',
        updatedAt: dateStr,
      } as BookUpdateRequest & { updatedAt: string }

      // Act
      await repository.updateProjection(id, updates)

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        {
          $set: expect.objectContaining({
            title: 'Updated Title',
            updatedAt: expect.any(Date),
          }),
        },
      )

      // Get the actual $set parameter from the call
      const updateCall = mockCollection.updateOne.mock.calls[0][1].$set

      // Verify the date was converted (not just checking "any Date" but actual conversion)
      expect(updateCall.updatedAt.toISOString()).toBe(dateStr)
    })
  })

  describe('markAsDeleted', () => {
    it('should mark a book as deleted', async () => {
      // Arrange
      const id = mockDocument._id.toString()
      const timestamp = new Date()

      // Act
      await repository.markAsDeleted(id, timestamp)

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        {
          $set: {
            deletedAt: timestamp,
            updatedAt: timestamp,
          },
        },
      )
    })
  })

  describe('findBookForReservation', () => {
    it('should return a book when it exists and is not deleted', async () => {
      // Act
      const result = await repository.findBookForReservation(mockBook.isbn)

      // Assert
      // Should return domain model (Book) not the document
      expect(result).toEqual(
        expect.objectContaining({
          isbn: mockBook.isbn,
          title: mockBook.title,
          // Should be string dates in the result (from domain model)
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      )

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        isbn: mockBook.isbn,
        deletedAt: { $exists: false },
      })
    })

    it('should return null when book does not exist', async () => {
      // Arrange
      mockCollection.findOne = vi.fn().mockResolvedValue(null)

      // Act
      const result =
        await repository.findBookForReservation('non-existent-isbn')

      // Assert
      expect(result).toBeNull()
    })
  })
})
