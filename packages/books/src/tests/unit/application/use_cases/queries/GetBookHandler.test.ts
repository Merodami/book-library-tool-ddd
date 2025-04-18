import { Book } from '@book-library-tool/sdk'
import { Errors } from '@book-library-tool/shared'
import { ErrorCode } from '@book-library-tool/shared/src/errorCodes.js'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { GetBookHandler } from '@books/use_cases/queries/GetBookHandler.js'
import { GetBookQuery } from '@books/use_cases/queries/GetBookQuery.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetBookHandler', () => {
  let mockProjectionRepository: IBookProjectionRepository
  let handler: GetBookHandler
  let mockBook: Book

  const validIsbn = '978-3-16-148410-0'

  const validQuery: GetBookQuery = {
    isbn: validIsbn,
  }

  beforeEach(() => {
    mockBook = {
      id: 'test-id',
      isbn: validIsbn,
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 19.99,
    } as Book

    mockProjectionRepository = {
      getBookByISBN: vi.fn().mockResolvedValue(mockBook),
      getAllBooks: vi.fn().mockResolvedValue({
        data: [],
        totalItems: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      }),
      saveProjection: vi.fn().mockResolvedValue(undefined),
      updateProjection: vi.fn().mockResolvedValue(undefined),
      markAsDeleted: vi.fn().mockResolvedValue(undefined),
      findBookForReservation: vi.fn().mockResolvedValue(null),
    }

    handler = new GetBookHandler(mockProjectionRepository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a book when it exists', async () => {
    // Act
    const result = await handler.execute(validQuery)

    // Assert
    expect(result).toBe(mockBook)
    expect(mockProjectionRepository.getBookByISBN).toHaveBeenCalledWith(
      validQuery.isbn,
    )
  })

  it('should throw an error when the book does not exist', async () => {
    // Arrange
    mockProjectionRepository.getBookByISBN = vi.fn().mockResolvedValue(null)

    // Act & Assert
    await expect(handler.execute(validQuery)).rejects.toThrow(
      new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ISBN ${validQuery.isbn} not found`,
      ),
    )

    expect(mockProjectionRepository.getBookByISBN).toHaveBeenCalledWith(
      validQuery.isbn,
    )
  })
})
