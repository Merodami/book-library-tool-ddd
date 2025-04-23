import { schemas } from '@book-library-tool/api'
import { BookUpdateRequest } from '@book-library-tool/sdk'
import { ErrorCode } from '@book-library-tool/shared'
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
  let mockBook: schemas.Book
  let mockDocument: BookDocument
  let mockId: string

  beforeEach(() => {
    mockId = new ObjectId().toString()

    // Create a domain model Book with string dates (ISO format)
    // Note: All fields are required for creating a new book
    mockBook = {
      id: mockId,
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
    // All required fields must be present for BookDocument
    mockDocument = {
      _id: new ObjectId(),
      id: mockId,
      isbn: mockBook.isbn!,
      title: mockBook.title!,
      author: mockBook.author!,
      publicationYear: mockBook.publicationYear!,
      publisher: mockBook.publisher!,
      price: mockBook.price!,
      version: 0,
      createdAt: new Date(mockBook.createdAt!),
      updatedAt: new Date(mockBook.updatedAt!),
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
      mockCollection as unknown as Collection<BookDocument>,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getBookById', () => {
    it('should return a book when it exists', async () => {
      const result = await repository.getBookById(mockId)

      expect(result).toEqual(
        expect.objectContaining({
          id: mockId,
          isbn: mockBook.isbn,
          title: mockBook.title,
          author: mockBook.author,
          publicationYear: mockBook.publicationYear,
          publisher: mockBook.publisher,
          price: mockBook.price,
        }),
      )
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          id: mockId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { projection: expect.any(Object) },
      )
    })

    it('should return null when book does not exist', async () => {
      mockCollection.findOne = vi.fn().mockResolvedValue(null)

      const result = await repository.getBookById('non-existent-id')

      expect(result).toBeNull()
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          id: 'non-existent-id',
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { projection: expect.any(Object) },
      )
    })
  })

  describe('getBookByIsbn', () => {
    it('should return a book when it exists', async () => {
      const result = await repository.getBookByIsbn(mockBook.isbn!)

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
        {
          isbn: mockBook.isbn,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { projection: expect.any(Object) },
      )
    })

    it('should return null when book does not exist', async () => {
      mockCollection.findOne = vi.fn().mockResolvedValue(null)

      const result = await repository.getBookByIsbn('non-existent-isbn')

      expect(result).toBeNull()
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          isbn: 'non-existent-isbn',
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { projection: expect.any(Object) },
      )
    })

    it('should apply field projection when fields are specified', async () => {
      const fields = ['title', 'author'] as schemas.BookField[]

      await repository.getBookByIsbn(mockBook.isbn!, fields)

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          isbn: mockBook.isbn,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { projection: { title: 1, author: 1 } },
      )
    })
  })

  describe('getAllBooks', () => {
    it('should return paginated books', async () => {
      const query: schemas.CatalogSearchQuery = {
        page: 1,
        limit: 10,
      }

      const result = await repository.getAllBooks(query)

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
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
    })

    it('should apply text search filters', async () => {
      const query: schemas.CatalogSearchQuery = {
        title: 'Test',
        author: 'Author',
        publisher: 'Publisher',
        page: 1,
        limit: 10,
      }

      await repository.getAllBooks(query)

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          title: { $regex: 'Test', $options: 'i' },
          author: { $regex: 'Author', $options: 'i' },
          publisher: { $regex: 'Publisher', $options: 'i' },
        }),
      )
    })

    it('should apply ISBN exact match filter', async () => {
      const query: schemas.CatalogSearchQuery = {
        isbn: '978-3-16-148410-0',
        page: 1,
        limit: 10,
      }

      await repository.getAllBooks(query)

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          isbn: '978-3-16-148410-0',
        }),
      )
    })

    it('should apply numeric range filters', async () => {
      const query: schemas.CatalogSearchQuery = {
        publicationYearMin: 2000,
        publicationYearMax: 2023,
        priceMin: 10,
        priceMax: 50,
        page: 1,
        limit: 10,
      }

      await repository.getAllBooks(query)

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          publicationYear: { $gte: 2000, $lte: 2023 },
          price: { $gte: 10, $lte: 50 },
        }),
      )
    })

    it('should apply sorting', async () => {
      const query: schemas.CatalogSearchQuery = {
        page: 1,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc',
      }

      await repository.getAllBooks(query)

      expect(mockCollection.sort).toHaveBeenCalledWith({ title: 1 })
    })
  })

  describe('saveProjection', () => {
    it('should save a new book projection', async () => {
      // Book validation should pass with all required fields
      await repository.saveBookProjection(mockBook)

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockId,
          isbn: mockBook.isbn,
          title: mockBook.title,
          author: mockBook.author,
          publicationYear: mockBook.publicationYear,
          publisher: mockBook.publisher,
          price: mockBook.price,
        }),
      )
    })

    it('should throw an error when required fields are missing', async () => {
      // Missing required fields
      const incompleteBook: schemas.Book = {
        id: mockId,
        title: 'Incomplete Book',
        // Missing other required fields
      }

      await expect(
        repository.saveBookProjection(incompleteBook),
      ).rejects.toThrow(ErrorCode.VALIDATION_ERROR)
    })
  })

  describe('updateBookProjection', () => {
    it('should update an existing book projection', async () => {
      const updateData: BookUpdateRequest = {
        title: 'Updated Title',
        author: 'Updated Author',
        publicationYear: 2024,
        publisher: 'Updated Publisher',
        price: 29.99,
      }

      const updateDate = new Date()

      await repository.updateBookProjection(mockId, updateData, updateDate)

      // Verify the updated fields in the $set object
      const expectedSetObject = Object.fromEntries([
        ...Object.entries(updateData).filter(
          ([_, value]) => value !== undefined,
        ),
        ['updatedAt', updateDate],
      ])

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        {
          id: mockId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        {
          $set: expectedSetObject,
        },
      )
    })
  })

  describe('markAsDeleted', () => {
    it('should mark a book as deleted', async () => {
      const deletedAt = new Date()

      await repository.markAsDeleted(mockId, deletedAt)

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        {
          id: mockId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { $set: { deletedAt, updatedAt: deletedAt } },
      )
    })
  })
})
