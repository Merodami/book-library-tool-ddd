import { schemas } from '@book-library-tool/api'
import { CatalogController } from '@books/controllers/catalog/CatalogController.js'
import { GetAllBooksHandler } from '@books/queries/GetAllBooksHandler.js'
import { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create mocks for the cache decorator
vi.mock('@book-library-tool/redis', () => ({
  Cache:
    () =>
    (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
  httpRequestKeyGenerator: vi.fn(),
}))

// Helper type for mocking FastifyRequest
type MockRequest = {
  [K in keyof FastifyRequest]: K extends 'query' ? any : FastifyRequest[K]
}

describe('CatalogController', () => {
  let getAllBooksHandler: GetAllBooksHandler
  let controller: CatalogController

  // Sample paginated response for tests
  const mockPaginatedResponse: schemas.PaginatedResult<schemas.BookDTO> = {
    data: [
      {
        id: 'book-1',
        isbn: '978-3-16-148410-0',
        title: 'Book One',
        author: 'Author One',
        publicationYear: 2023,
        publisher: 'Publisher',
        price: 19.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'book-2',
        isbn: '978-3-16-148410-1',
        title: 'Book Two',
        author: 'Author Two',
        publicationYear: 2024,
        publisher: 'Publisher',
        price: 29.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 10,
      pages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }

  beforeEach(() => {
    // Create a mock for the GetAllBooksHandler
    getAllBooksHandler = {
      execute: vi.fn().mockResolvedValue(mockPaginatedResponse),
    } as unknown as GetAllBooksHandler

    // Initialize the controller with the mocked handler
    controller = new CatalogController(getAllBooksHandler)
  })

  describe('getAllBooks', () => {
    it('passes query parameters to the handler', async () => {
      // Create a mock query with pagination, filtering, and sorting
      const query: schemas.CatalogSearchQuery = {
        page: 1,
        limit: 10,
        title: 'Book',
        author: 'Author',
        sortBy: 'title',
        sortOrder: 'asc',
      }

      // Create mock Fastify request
      const mockRequest = {
        query,
      } as MockRequest

      // Call the controller method
      const result = await controller.getAllBooks(mockRequest)

      // Verify the handler was called with the correct query
      expect(getAllBooksHandler.execute).toHaveBeenCalledWith(query, undefined)

      // Verify the controller returns the handler's response
      expect(result).toEqual(mockPaginatedResponse)
    })

    it('filters field selection correctly', async () => {
      // Create a query with field selection
      const query: schemas.CatalogSearchQuery = {
        page: 1,
        limit: 10,
        fields: 'id, title, author, invalidField', // Include an invalid field
      }

      // Create mock request
      const mockRequest = {
        query,
      } as MockRequest

      // Call the controller method
      await controller.getAllBooks(mockRequest)

      // Verify the handler was called with only valid fields
      expect(getAllBooksHandler.execute).toHaveBeenCalledWith(
        query,
        ['id', 'title', 'author'], // Invalid field should be filtered out
      )
    })

    it('handles empty queries', async () => {
      // Create an empty query
      const emptyQuery = {}

      // Create mock request with empty query
      const mockRequest = {
        query: emptyQuery,
      } as MockRequest

      // Call the controller method
      await controller.getAllBooks(mockRequest)

      // Verify the handler was called with the empty query
      expect(getAllBooksHandler.execute).toHaveBeenCalledWith(
        emptyQuery,
        undefined,
      )
    })

    it('propagates errors from the handler', async () => {
      // Setup handler to throw an error
      const testError = new Error('Test error')

      getAllBooksHandler.execute = vi.fn().mockRejectedValue(testError)

      // Create mock request
      const mockRequest = {
        query: {},
      } as MockRequest

      // Expect the controller to propagate the error
      await expect(controller.getAllBooks(mockRequest)).rejects.toThrow(
        testError,
      )
    })
  })
})
