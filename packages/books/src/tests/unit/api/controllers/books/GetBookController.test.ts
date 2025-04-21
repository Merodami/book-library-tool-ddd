import { Book as BookDTO } from '@book-library-tool/sdk'
import { GetBookController } from '@books/controllers/books/GetBookController.js'
import { GetBookHandler } from '@books/queries/GetBookHandler.js'
import { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create mocks for the cache decorator
vi.mock('@book-library-tool/redis', () => ({
  Cache:
    () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
  httpRequestKeyGenerator: vi.fn(),
}))

// Type to make testing Fastify request easier
type MockRequest<T, Q = {}> = {
  [K in keyof FastifyRequest]: K extends 'params'
    ? T
    : K extends 'query'
      ? Q
      : FastifyRequest[K]
}

describe('GetBookController', () => {
  let getBookHandler: GetBookHandler
  let controller: GetBookController

  // Sample book ID and mock book data
  const bookId = 'test-id-123'
  const mockBook: BookDTO = {
    id: bookId,
    isbn: '978-3-16-148410-0',
    title: 'Test Book',
    author: 'Test Author',
    publicationYear: 2023,
    publisher: 'Test Publisher',
    price: 19.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    // Create a mock for the GetBookHandler
    getBookHandler = {
      execute: vi.fn().mockResolvedValue(mockBook),
    } as unknown as GetBookHandler

    // Initialize the controller with the mocked handler
    controller = new GetBookController(getBookHandler)
  })

  describe('getBook', () => {
    it('retrieves a book by ID with no field filtering', async () => {
      // Create mock Fastify request
      const mockRequest = {
        params: { id: bookId },
        query: {},
      } as MockRequest<{ id: string }>

      // Call the controller method
      const result = await controller.getBook(mockRequest)

      // Verify the handler was called with the correct query and no fields
      expect(getBookHandler.execute).toHaveBeenCalledWith(
        { id: bookId },
        undefined,
      )

      // Verify the controller returns the handler's response
      expect(result).toEqual(mockBook)
    })

    it('passes valid fields to the handler', async () => {
      // Create mock request with field filtering
      const mockRequest = {
        params: { id: bookId },
        query: { fields: 'id,title,author' },
      } as MockRequest<{ id: string }, { fields: string }>

      // Call the controller method
      await controller.getBook(mockRequest)

      // Verify the handler was called with the correct fields
      expect(getBookHandler.execute).toHaveBeenCalledWith({ id: bookId }, [
        'id',
        'title',
        'author',
      ])
    })

    it('filters out invalid fields', async () => {
      // Create mock request with invalid fields
      const mockRequest = {
        params: { id: bookId },
        query: { fields: 'id,title,nonExistentField' },
      } as MockRequest<{ id: string }, { fields: string }>

      // Call the controller method
      await controller.getBook(mockRequest)

      // Verify the handler was called with only valid fields
      expect(getBookHandler.execute).toHaveBeenCalledWith({ id: bookId }, [
        'id',
        'title',
      ])
    })

    it('propagates errors from the handler', async () => {
      // Setup handler to throw an error
      const testError = new Error('Test error')

      getBookHandler.execute = vi.fn().mockRejectedValue(testError)

      // Create mock request
      const mockRequest = {
        params: { id: bookId },
        query: {},
      } as MockRequest<{ id: string }>

      // Expect the controller to propagate the error
      await expect(controller.getBook(mockRequest)).rejects.toThrow(testError)
    })
  })
})
