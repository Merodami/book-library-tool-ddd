import { EventResponse } from '@book-library-tool/sdk'
import { UpdateBookCommand } from '@books/commands/UpdateBookCommand.js'
import { UpdateBookHandler } from '@books/commands/UpdateBookHandler.js'
import { UpdateBookController } from '@books/controllers/books/UpdateBookController.js'
import { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Type to make testing Fastify request easier
type MockRequest<P, B> = {
  [K in keyof FastifyRequest]: K extends 'params'
    ? P
    : K extends 'body'
      ? B
      : FastifyRequest[K]
}

describe('UpdateBookController', () => {
  let updateBookHandler: UpdateBookHandler
  let controller: UpdateBookController

  // Sample book ID and update data for tests
  const bookId = 'test-id-123'
  const updateData: Omit<UpdateBookCommand, 'id'> = {
    title: 'Updated Book Title',
    author: 'Updated Author',
    publicationYear: 2024,
    publisher: 'Updated Publisher',
    price: 29.99,
  }

  // Sample response from the handler
  const handlerResponse: EventResponse & { bookId: string } = {
    success: true,
    bookId: bookId,
    version: 2,
  }

  beforeEach(() => {
    // Create a mock for the UpdateBookHandler
    updateBookHandler = {
      execute: vi.fn().mockResolvedValue(handlerResponse),
    } as unknown as UpdateBookHandler

    // Initialize the controller with the mocked handler
    controller = new UpdateBookController(updateBookHandler)
  })

  describe('updateBook', () => {
    it('combines ID from params with update data from body', async () => {
      // Create mock Fastify request
      const mockRequest = {
        params: { id: bookId },
        body: updateData,
      } as MockRequest<{ id: string }, Omit<UpdateBookCommand, 'id'>>

      // Call the controller method
      const result = await controller.updateBook(mockRequest)

      // Verify the handler was called with the correct command
      expect(updateBookHandler.execute).toHaveBeenCalledWith({
        id: bookId,
        ...updateData,
      })

      // Verify the controller returns the handler's response
      expect(result).toEqual(handlerResponse)
    })

    it('handles partial update data', async () => {
      // Create partial update data
      const partialUpdateData = {
        title: 'Updated Book Title',
        price: 29.99,
      }

      // Create mock request with partial data
      const mockRequest = {
        params: { id: bookId },
        body: partialUpdateData,
      } as unknown as MockRequest<{ id: string }, Omit<UpdateBookCommand, 'id'>>

      // Call the controller method
      await controller.updateBook(mockRequest)

      // Verify the handler was called with only the provided fields plus ID
      expect(updateBookHandler.execute).toHaveBeenCalledWith({
        id: bookId,
        ...partialUpdateData,
      })
    })

    it('propagates errors from the handler', async () => {
      // Setup handler to throw an error
      const testError = new Error('Test error')

      updateBookHandler.execute = vi.fn().mockRejectedValue(testError)

      // Create mock request
      const mockRequest = {
        params: { id: bookId },
        body: updateData,
      } as MockRequest<{ id: string }, Omit<UpdateBookCommand, 'id'>>

      // Expect the controller to propagate the error
      await expect(controller.updateBook(mockRequest)).rejects.toThrow(
        testError,
      )
    })
  })
})
