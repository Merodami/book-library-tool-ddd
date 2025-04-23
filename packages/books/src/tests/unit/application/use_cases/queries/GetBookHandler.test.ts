import { schemas } from '@book-library-tool/api'
import { Book } from '@book-library-tool/sdk'
import { Errors, logger } from '@book-library-tool/shared'
import { ErrorCode } from '@book-library-tool/shared/src/errorCodes.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { GetBookHandler } from '@books/use_cases/queries/GetBookHandler.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetBookHandler', () => {
  let mockBookProjectionRepository: IBookProjectionRepository
  let handler: GetBookHandler
  let mockBook: Book

  const validId = '123e4567-e89b-12d3-a456-426614174000'
  const validIsbn = '978-3-16-148410-0'

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
    const result = await handler.execute(validId)

    expect(result).toEqual(mockBook) // Changed toBe to toEqual for object comparison
    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      validId,
      undefined,
    )
  })

  it('should throw an error when the book does not exist', async () => {
    mockBookProjectionRepository.getBookById = vi.fn().mockResolvedValue(null)

    await expect(handler.execute(validId)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${validId} not found`,
      ),
    )

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      validId,
      undefined,
    )
  })

  it('should pass additional fields parameter when provided', async () => {
    const fields = ['title', 'author', 'price'] as schemas.BookSortField[]

    await handler.execute(validId, fields)

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      validId,
      fields,
    )
  })

  it('should work with numeric ID', async () => {
    const numericIdQuery = '123'

    await handler.execute(numericIdQuery)

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      numericIdQuery,
      undefined,
    )
  })

  it('should throw error with proper ID in message', async () => {
    mockBookProjectionRepository.getBookById = vi.fn().mockResolvedValue(null)

    const specialQuery = 'special-123'

    await expect(handler.execute(specialQuery, undefined)).rejects.toEqual(
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

    await expect(handler.execute(validId)).rejects.toThrow(testError)
  })
})
