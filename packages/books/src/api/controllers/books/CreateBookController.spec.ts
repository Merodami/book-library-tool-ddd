import { EventResponse } from '@book-library-tool/sdk'
import { CreateBookController } from '@books/api/index.js'
import type { CreateBookCommand } from '@books/application/index.js'
import { CreateBookHandler } from '@books/application/index.js'
import { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Type to make testing Fastify request easier
type MockRequest<T> = {
  [K in keyof FastifyRequest]: K extends 'params'
    ? T
    : K extends 'body'
      ? CreateBookCommand
      : FastifyRequest[K]
}

describe('CreateBookController', () => {
  let createBookHandler: CreateBookHandler
  let controller: CreateBookController

  // Sample book ID for tests
  const bookId = 'test-id-123'

  // Sample book ID for tests
  const book: CreateBookCommand = {
    isbn: '1234567890',
    title: 'Test Book',
    author: 'Test Author',
    publicationYear: 2023,
    publisher: 'Test Publisher',
    price: 19.99,
  }

  // Sample response from the handler
  const handlerResponse: EventResponse & { bookId: string } = {
    success: true,
    bookId: bookId,
    version: 2,
  }

  beforeEach(() => {
    // Create a mock for the CreateBookHandler
    createBookHandler = {
      execute: vi.fn().mockResolvedValue(handlerResponse),
    } as unknown as CreateBookHandler

    // Initialize the controller with the mocked handler
    controller = new CreateBookController(createBookHandler)
  })

  describe('createBook', () => {
    it('extracts book ID from request params', async () => {
      // Create mock Fastify request
      const mockRequest = {
        params: { id: bookId },
        body: book,
      } as MockRequest<{ id: string }>

      // Call the controller method
      const result = await controller.createBook(mockRequest)

      // Verify the handler was called with the correct command
      expect(createBookHandler.execute).toHaveBeenCalledWith(book)

      // Verify the controller returns the handler's response
      expect(result).toEqual(handlerResponse)
    })

    it('propagates errors from the handler', async () => {
      // Setup handler to throw an error
      const testError = new Error('Test error')

      createBookHandler.execute = vi.fn().mockRejectedValue(testError)

      // Create mock request
      const mockRequest = {
        params: { id: bookId },
        body: book,
      } as MockRequest<{ id: string }>

      // Expect the controller to propagate the error
      await expect(controller.createBook(mockRequest)).rejects.toThrow(
        testError,
      )
    })
  })
})
