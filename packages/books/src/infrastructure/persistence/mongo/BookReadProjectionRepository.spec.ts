// packages/books/src/infrastructure/persistence/mongo/BookReadProjectionRepository.spec.ts
import { buildProjection } from '@book-library-tool/database'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import type {
  BookReadProjectionRepositoryPort,
  DomainBook,
} from '@books/domain/index.js'
import { BookReadProjectionRepository } from '@books/infrastructure/persistence/mongo/BookReadProjectionRepository.js'
import type { BookDocument } from '@books/infrastructure/persistence/mongo/documents/BookDocument.js'
import { ObjectId } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// stub out the real mapping function for most tests
vi.mock('@books/infrastructure/index.js', () => ({
  mapToDomain: (doc: Partial<BookDocument>) => doc as DomainBook,
}))

describe('BookReadProjectionRepository', () => {
  let mockCollection: {
    findOne: ReturnType<typeof vi.fn>
    find: ReturnType<typeof vi.fn>
    project: ReturnType<typeof vi.fn>
    skip: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
    sort: ReturnType<typeof vi.fn>
    toArray: ReturnType<typeof vi.fn>
    countDocuments: ReturnType<typeof vi.fn>
  }

  let bookReadRepository: BookReadProjectionRepositoryPort
  let sampleBookId: string
  let sampleDocument: BookDocument

  beforeEach(() => {
    sampleBookId = new ObjectId().toString()

    sampleDocument = {
      id: sampleBookId,
      isbn: '978-3-16-148410-0',
      title: 'Example Book',
      author: 'Jane Doe',
      publicationYear: 2023,
      publisher: 'Acme Publishing',
      price: 29.99,
      version: 1,
      createdAt: new Date('2023-01-01T12:00:00Z'),
      updatedAt: new Date('2023-01-01T12:00:00Z'),
    }

    mockCollection = {
      findOne: vi.fn().mockResolvedValue(sampleDocument),
      find: vi.fn().mockReturnThis(),
      project: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([sampleDocument]),
      countDocuments: vi.fn().mockResolvedValue(1),
    }

    bookReadRepository = new BookReadProjectionRepository(mockCollection as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getBookById()', () => {
    it('should return a domain book when found', async () => {
      const result = await bookReadRepository.getBookById({ id: sampleBookId })

      expect(result).toEqual(
        expect.objectContaining({
          id: sampleBookId,
          title: sampleDocument.title,
        }),
      )

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          id: sampleBookId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { projection: buildProjection(undefined) },
      )
    })

    it('should omit deletion filter when includeDeleted=true', async () => {
      await bookReadRepository.getBookById(
        { id: sampleBookId },
        undefined,
        /* includeDeleted */ true,
      )

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { id: sampleBookId },
        { projection: buildProjection(undefined) },
      )
    })

    it('should return null when not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null)

      const result = await bookReadRepository.getBookById({ id: 'nope' })

      expect(result).toBeNull()
    })

    it('should wrap mapping exceptions in ApplicationError', async () => {
      // have the collection return a “bad” document
      mockCollection.findOne.mockResolvedValueOnce({ not: 'a book doc' })

      // override this instance’s mapper to throw
      ;(bookReadRepository as any).mapToDto = () => {
        throw new Error('mapping failure')
      }

      await expect(
        bookReadRepository.getBookById({ id: sampleBookId }),
      ).rejects.toMatchObject(
        new Errors.ApplicationError(
          500,
          ErrorCode.INTERNAL_ERROR,
          `Invalid book doc for ID ${sampleBookId} data`,
        ),
      )
    })
  })

  describe('getBookByIsbn()', () => {
    it('should filter on ISBN and return the matching book', async () => {
      const result = await bookReadRepository.getBookByIsbn(
        sampleDocument.isbn!,
      )

      expect(result).toEqual(
        expect.objectContaining({ isbn: sampleDocument.isbn }),
      )

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          isbn: sampleDocument.isbn,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        { projection: buildProjection(undefined) },
      )
    })
  })

  describe('getAllBooks()', () => {
    it('should return paginated results with defaults', async () => {
      const paginated = await bookReadRepository.getAllBooks({
        page: 1,
        limit: 10,
      })

      expect(paginated).toEqual({
        data: [expect.objectContaining({ id: sampleBookId })],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })

      // The count and find calls both include the not-deleted filter
      const expectedFilter = {
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      }

      expect(mockCollection.countDocuments).toHaveBeenCalledWith(expectedFilter)
      expect(mockCollection.find).toHaveBeenCalledWith(expectedFilter)
    })

    it('should apply sortBy & sortOrder to the cursor', async () => {
      await bookReadRepository.getAllBooks({
        page: 1,
        limit: 5,
        sortBy: 'title',
        sortOrder: 'desc',
      })

      expect(mockCollection.sort).toHaveBeenCalledWith({ title: -1 })
    })

    it('should project only requested fields', async () => {
      await bookReadRepository.getAllBooks({ page: 2, limit: 5 }, [
        'title',
        'author',
      ])

      expect(mockCollection.project).toHaveBeenCalledWith({
        title: 1,
        author: 1,
      })
    })
  })
})
