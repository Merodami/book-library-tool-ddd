import { schemas } from '@book-library-tool/api'
import { Book } from '@book-library-tool/sdk'
import { Errors, logger } from '@book-library-tool/shared'
import { ErrorCode } from '@book-library-tool/shared/src/errorCodes.js'
import type { GetBookQuery } from '@books/application/index.js'
import { GetBookHandler } from '@books/application/index.js'
import type { IBookReadProjectionRepository } from '@books/domain/index.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetBookHandler', () => {
  let mockBookProjectionRepository: IBookReadProjectionRepository
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
    } as unknown as IBookReadProjectionRepository

    handler = new GetBookHandler(mockBookProjectionRepository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a book when it exists', async () => {
    const query: GetBookQuery = { id: validId }
    const result = await handler.execute(query)

    expect(result).toEqual(mockBook)
    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      query,
      undefined,
    )
  })

  it('should throw an error when the book does not exist', async () => {
    mockBookProjectionRepository.getBookById = vi.fn().mockResolvedValue(null)

    const query: GetBookQuery = { id: validId }

    await expect(handler.execute(query)).rejects.toEqual(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${validId} not found`,
      ),
    )

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      query,
      undefined,
    )
  })

  it('should pass additional fields parameter when provided', async () => {
    const fields = ['title', 'author', 'price'] as schemas.BookSortField[]
    const query: GetBookQuery = { id: validId }

    await handler.execute(query, fields)

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      query,
      fields,
    )
  })

  it('should work with numeric ID', async () => {
    const numericIdQuery: GetBookQuery = { id: '123' }

    await handler.execute(numericIdQuery)

    expect(mockBookProjectionRepository.getBookById).toHaveBeenCalledWith(
      numericIdQuery,
      undefined,
    )
  })

  it('should throw error with proper ID in message', async () => {
    mockBookProjectionRepository.getBookById = vi.fn().mockResolvedValue(null)

    const specialQuery: GetBookQuery = { id: 'special-123' }

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
    const query: GetBookQuery = { id: validId }

    mockBookProjectionRepository.getBookById = vi
      .fn()
      .mockRejectedValue(testError)

    await expect(handler.execute(query)).rejects.toThrow(testError)
  })
})
