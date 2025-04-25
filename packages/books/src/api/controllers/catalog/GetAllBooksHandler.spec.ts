import { schemas } from '@book-library-tool/api'
import { GetAllBooksHandler } from '@books/application/index.js'
import type { IBookReadProjectionRepository } from '@books/domain/index.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetAllBooksHandler', () => {
  let mockProjectionRepository: IBookReadProjectionRepository
  let handler: GetAllBooksHandler
  let mockBooks: schemas.Book[]
  let mockPaginatedResponse: schemas.PaginatedResult<schemas.Book>

  const validQuery: schemas.CatalogSearchQuery = {
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
        id: '123e4567-e89b-12d3-a456-426614174000',
        isbn: '978-3-16-148410-0',
        title: 'Test Book 1',
        author: 'Test Author 1',
        publicationYear: 2023,
        publisher: 'Test Publisher',
        price: 19.99,
        createdAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        isbn: '978-3-16-148410-1',
        title: 'Test Book 2',
        author: 'Test Author 2',
        publicationYear: 2024,
        publisher: 'Test Publisher',
        price: 29.99,
        createdAt: '2023-01-01T00:00:00.000Z',
      },
    ] as schemas.Book[]

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
      getBookById: vi.fn().mockResolvedValue(null),
      getBookByIsbn: vi.fn().mockResolvedValue(null),
      getAllBooks: vi.fn().mockResolvedValue(mockPaginatedResponse),
    } as unknown as IBookReadProjectionRepository

    handler = new GetAllBooksHandler(mockProjectionRepository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return all books when query is valid', async () => {
    const result = await handler.execute(validQuery)

    expect(result).toEqual(mockPaginatedResponse)
    expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
      validQuery,
      undefined,
    )
  })

  it('should use default values when parameters are missing', async () => {
    const partialQuery: Partial<schemas.CatalogSearchQuery> = {
      title: 'Test Book',
    }

    const result = await handler.execute(
      partialQuery as schemas.CatalogSearchQuery,
    )

    expect(result).toEqual(mockPaginatedResponse)
    expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
      partialQuery,
      undefined,
    )
  })

  it('should handle request with only pagination parameters', async () => {
    const paginationQuery: Partial<schemas.CatalogSearchQuery> = {
      page: 2,
      limit: 20,
    }

    const result = await handler.execute(
      paginationQuery as schemas.CatalogSearchQuery,
    )

    expect(result).toEqual(mockPaginatedResponse)
    expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
      paginationQuery,
      undefined,
    )
  })

  it('should pass fields parameter to repository when provided', async () => {
    const fields = ['title', 'author', 'price'] as schemas.BookField[]

    const result = await handler.execute(validQuery, fields)

    expect(result).toEqual(mockPaginatedResponse)
    expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
      validQuery,
      fields,
    )
  })

  it('should return empty data when repository returns null', async () => {
    mockProjectionRepository.getAllBooks = vi.fn().mockResolvedValue(null)

    const result = await handler.execute(validQuery)

    expect(result).toEqual({
      data: [],
      pagination: {
        total: 0,
        page: validQuery.page,
        limit: validQuery.limit,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      },
    })
  })
})
