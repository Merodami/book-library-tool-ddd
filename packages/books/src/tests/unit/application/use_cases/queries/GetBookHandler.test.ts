import { schemas } from '@book-library-tool/api'
import { Book } from '@book-library-tool/sdk'
import { Errors, logger } from '@book-library-tool/shared'
import { ErrorCode } from '@book-library-tool/shared/src/errorCodes.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { GetBookHandler } from '@books/use_cases/queries/GetBookHandler.js'
import { GetBookQuery } from '@books/use_cases/queries/GetBookQuery.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetBookHandler', () => {
  let mockBookProjectionRepository: IBookProjectionRepository
  let handler: GetBookHandler
  let mockBook: Book

  const validId = 'test-id'
  const validIsbn = '978-3-16-148410-0'
  const validQuery: GetBookQuery = {
    id: validId,
  }

  beforeEach(() => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mockBook = {
      id: validId,
      isbn: validIsbn,
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 19.99,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: null,
      deletedAt: null,
    } as Book

    mockBookProjectionRepository = {
      getBookById: vi.fn().mockResolvedValue(mockBook),
      getBookByIsbn: vi.fn().mockResolvedValue(mockBook),
      getAllBooks: vi.fn().mockResolvedValue({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }),
      saveProjection: vi.fn().mockResolvedValue(undefined),
      updateProjection: vi.fn().mockResolvedValue(undefined),
      markAsDeleted: vi.fn().mockResolvedValue(undefined),
    } as unknown as IBookProjectionRepository

    handler = new GetBookHandler(mockBookProjectionRepository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a book when it exists', async () => {
    const result = await handler.execute(validQuery)

    expect(result).toEqual(mockBook) // Changed toBe to toEqual for object comparison
    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      validQuery.id,
      undefined,
    )
  })

  it('should throw an error when the book does not exist', async () => {
    mockBookProjectionRepository.getBookById = vi.fn().mockResolvedValue(null)

    await expect(handler.execute(validQuery)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${validQuery.id} not found`,
      ),
    )

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      validQuery.id,
      undefined,
    )
  })

  it('should pass additional fields parameter when provided', async () => {
    const fields = ['title', 'author', 'price'] as schemas.BookSortField[]

    await handler.execute(validQuery, fields)

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      validQuery.id,
      fields,
    )
  })

  it('should work with numeric ID', async () => {
    const numericIdQuery: GetBookQuery = {
      id: '123', // Numeric ID as string
    }

    await handler.execute(numericIdQuery)

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      numericIdQuery.id,
      undefined,
    )
  })

  it('should throw error with proper ID in message', async () => {
    mockBookProjectionRepository.getBookById = vi.fn().mockResolvedValue(null)

    const specialQuery: GetBookQuery = {
      id: 'special-123',
    }

    await expect(handler.execute(specialQuery)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID special-123 not found`,
      ),
    )
  })

  it('should handle errors from the repository and preserve the error stack', async () => {
    const testError = new Error('Database connection failed')

    mockBookProjectionRepository.getBookById = vi
      .fn()
      .mockRejectedValue(testError)

    await expect(handler.execute(validQuery)).rejects.toThrow(testError)
  })
})
