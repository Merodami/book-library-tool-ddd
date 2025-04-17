import {
  Book,
  CatalogSearchQuery,
  PaginatedBookResponse,
} from '@book-library-tool/sdk'
import { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import { GetAllBooksHandler } from '@books/use_cases/queries/GetAllBooksHandler.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetAllBooksHandler', () => {
  let mockProjectionRepository: IBookProjectionRepository
  let handler: GetAllBooksHandler
  let mockBooks: Book[]
  let mockPaginatedResponse: PaginatedBookResponse

  const validQuery: CatalogSearchQuery = {
    title: 'Test Book',
    author: 'Test Author',
    page: 1,
    limit: 10,
    sortBy: 'title',
    sortOrder: 'asc',
  }

  beforeEach(() => {
    mockBooks = [
      {
        isbn: '978-3-16-148410-0',
        title: 'Test Book 1',
        author: 'Test Author 1',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 19.99,
      },
      {
        isbn: '978-3-16-148410-1',
        title: 'Test Book 2',
        author: 'Test Author 2',
        publicationYear: 2024,
        publisher: 'Test Publisher',
        price: 29.99,
      },
    ] as Book[]

    mockPaginatedResponse = {
      data: mockBooks,
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    }

    mockProjectionRepository = {
      getBookByISBN: vi.fn().mockResolvedValue(null),
      getAllBooks: vi.fn().mockResolvedValue(mockPaginatedResponse),
      saveProjection: vi.fn().mockResolvedValue(undefined),
      updateProjection: vi.fn().mockResolvedValue(undefined),
      markAsDeleted: vi.fn().mockResolvedValue(undefined),
      findBookForReservation: vi.fn().mockResolvedValue(null),
    }

    handler = new GetAllBooksHandler(mockProjectionRepository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return all books when query is valid', async () => {
    // Act
    const result = await handler.execute(validQuery)

    // Assert
    expect(result).toBe(mockPaginatedResponse)
    expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
      validQuery,
    )
  })

  it('should use default values when parameters are missing', async () => {
    // Arrange
    const partialQuery: Partial<CatalogSearchQuery> = {
      title: 'Test Book',
    }

    // Act
    const result = await handler.execute(partialQuery as CatalogSearchQuery)

    // Assert
    expect(result).toBe(mockPaginatedResponse)
    expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
      partialQuery,
    )
  })

  it('should handle request with only pagination parameters', async () => {
    // Arrange
    const paginationQuery: Partial<CatalogSearchQuery> = {
      page: 2,
      limit: 20,
    }

    // Act
    const result = await handler.execute(paginationQuery as CatalogSearchQuery)

    // Assert
    expect(result).toBe(mockPaginatedResponse)
    expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
      paginationQuery,
    )
  })
})
