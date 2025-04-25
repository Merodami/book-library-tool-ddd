import { EventResponse } from '@book-library-tool/sdk'
import { DeleteBookController } from '@books/api/index.js'
import { DeleteBookHandler } from '@books/application/index.js'
import { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Type to make testing Fastify request easier
type MockRequest<T> = {
  [K in keyof FastifyRequest]: K extends 'params' ? T : FastifyRequest[K]
}

describe('DeleteBookController', () => {
  let deleteBookHandler: DeleteBookHandler
  let controller: DeleteBookController

  // Sample book ID for tests
  const bookId = 'test-id-123'

  // Sample response from the handler
  const handlerResponse: EventResponse & { bookId: string } = {
    success: true,
    bookId: bookId,
    version: 2,
  }

  beforeEach(() => {
    // Create a mock for the DeleteBookHandler
    deleteBookHandler = {
      execute: vi.fn().mockResolvedValue(handlerResponse),
    } as unknown as DeleteBookHandler

    // Initialize the controller with the mocked handler
    controller = new DeleteBookController(deleteBookHandler)
  })

  describe('deleteBook', () => {
    it('extracts book ID from request params', async () => {
      // Create mock Fastify request
      const mockRequest = {
        params: { id: bookId },
      } as MockRequest<{ id: string }>

      // Call the controller method
      const result = await controller.deleteBook(mockRequest)

      // Verify the handler was called with the correct command
      expect(deleteBookHandler.execute).toHaveBeenCalledWith({ id: bookId })

      // Verify the controller returns the handler's response
      expect(result).toEqual(handlerResponse)
    })

    it('propagates errors from the handler', async () => {
      // Setup handler to throw an error
      const testError = new Error('Test error')

      deleteBookHandler.execute = vi.fn().mockRejectedValue(testError)

      // Create mock request
      const mockRequest = {
        params: { id: bookId },
      } as MockRequest<{ id: string }>

      // Expect the controller to propagate the error
      await expect(controller.deleteBook(mockRequest)).rejects.toThrow(
        testError,
      )
    })
  })
})
