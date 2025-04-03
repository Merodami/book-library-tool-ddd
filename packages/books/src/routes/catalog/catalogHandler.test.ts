import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { catalogHandler } from './catalogHandler.js'
import { DatabaseService, paginationHelper } from '@book-library-tool/database'
import type { Book } from '@book-library-tool/sdk'

// We assume that your books have createdAt and updatedAt properties.
describe('catalogHandler.searchCatalog', () => {
  let fakeGetPaginatedData: any,
    fakeReservationsCollection: any,
    fakeBooksCollection: any,
    req: any,
    res: any,
    next: any

  // Sample books array to be returned.
  const sampleBooks: Book[] = [
    {
      id: 'book2',
      title: 'Another Book',
      author: 'Another Author',
      publicationYear: 2020,
      publisher: 'Publisher 2',
      price: 15,
    },
  ]

  // Extra paginated information on response
  const paginationData = {
    data: sampleBooks,
    pagination: {
      page: 1,
      limit: 10,
      total: 8,
      pages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }

  beforeEach(() => {
    // Create a fake books paginated data with a mocked getPaginatedData method.
    fakeGetPaginatedData = vi.spyOn(paginationHelper, 'getPaginatedData')
    fakeReservationsCollection = {
      findOne: vi.fn(),
      insertOne: vi.fn(),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn(),
      }),
    }
    fakeBooksCollection = {
      find: vi.fn(),
    }

    // Stub DatabaseService.getCollection to always return our fakeBooksCollection.
    vi.spyOn(DatabaseService, 'getCollection').mockImplementation(
      (collectionName: string) => {
        if (collectionName === 'books') return fakeBooksCollection
        if (collectionName === 'reservations') return fakeReservationsCollection
      },
    )

    // Setup basic Express mocks.
    req = { query: {} }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }
    next = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('should search catalog with valid query parameters', async () => {
    // Arrange: valid query parameters.
    req.query = {
      title: 'Test',
      author: 'Author',
      publicationYear: '2022',
    }
    req.pagination = { page: 1, limit: 10 }

    fakeGetPaginatedData.mockResolvedValue(paginationData)

    // Act
    await catalogHandler.searchCatalog(req, res, next)

    // Assert: Verify that the books collection was retrieved.
    expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')

    // Verify if call to getPaginatedData was made with expected parameters
    expect(fakeGetPaginatedData).toHaveBeenCalledWith(
      fakeBooksCollection,
      {
        title: { $regex: /Test/i },
        author: { $regex: /Author/i },
        publicationYear: 2022,
      },
      req,
      { projection: { _id: 0 } },
    )

    // Verify that the filter was built correctly.
    const filterUsed = fakeGetPaginatedData.mock.calls[0]

    expect(filterUsed[1]).toHaveProperty('title')
    expect(filterUsed[1]).toHaveProperty('author')
    expect(filterUsed[1]).toHaveProperty('publicationYear', 2022)
    expect(filterUsed[1].title.$regex).toBeInstanceOf(RegExp)
    expect(filterUsed[1].title.$regex.source).toContain('Test')
    expect(filterUsed[1].title.$regex.flags).toContain('i')
    expect(filterUsed[1].author.$regex).toBeInstanceOf(RegExp)
    expect(filterUsed[1].author.$regex.source).toContain('Author')
    expect(filterUsed[1].author.$regex.flags).toContain('i')

    // Verify that response is returned with status 200 and the sample books.
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(paginationData)
  })

  test('should search catalog with no query parameters and return all books', async () => {
    // Arrange: no query parameters.
    req.query = {}

    fakeGetPaginatedData.mockResolvedValue(paginationData)

    // Act
    await catalogHandler.searchCatalog(req, res, next)

    // Assert: Verify that the books collection was retrieved.
    expect(DatabaseService.getCollection).toHaveBeenCalledWith('books')

    // Verify if call to getPaginatedData was made with expected parameters
    expect(fakeGetPaginatedData).toHaveBeenCalledWith(
      fakeBooksCollection,
      {},
      req,
      { projection: { _id: 0 } },
    )

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(paginationData)
  })

  test('should call next with error if an exception occurs', async () => {
    // Arrange: Simulate an error when retrieving books.
    const error = new TypeError('collection.countDocuments is not a function')

    req.query = { title: 'Test' }
    req.pagination = { page: 1, limit: 10 }

    fakeBooksCollection.find.mockReturnValue({
      toArray: vi.fn().mockRejectedValue(error),
    })

    // Act
    await catalogHandler.searchCatalog(req, res, next)

    // Assert: next() should be called with the error.
    expect(next).toHaveBeenCalledWith(error)
  })
})
