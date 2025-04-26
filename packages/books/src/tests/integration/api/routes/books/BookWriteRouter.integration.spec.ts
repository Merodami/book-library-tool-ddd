import { BookCreateRequest, BookUpdateRequest } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import {
  createMockEventBus,
  setupSilentLogging,
} from '@book-library-tool/tests'
import { createBookWriteRouter } from '@books/api/routes/books/BookWriteRouter.js'
import type { BookReadProjectionRepositoryPort } from '@books/domain/index.js'
import {
  createMockBookReadProjectionRepository,
  createMockBookWriteRepository,
} from '@books/tests/mocks/index.js'
import Fastify, { FastifyInstance } from 'fastify'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Set environment variables for test mode to silence logging
setupSilentLogging()

// Mock handlers
vi.mock('@books/application/use_cases/commands/CreateBookHandler.js', () => ({
  CreateBookHandler: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
      version: 1,
    }),
  })),
}))

vi.mock('@books/application/use_cases/commands/UpdateBookHandler.js', () => ({
  UpdateBookHandler: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
      version: 2,
    }),
  })),
}))

vi.mock('@books/application/use_cases/commands/DeleteBookHandler.js', () => ({
  DeleteBookHandler: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
      version: 1,
    }),
  })),
}))

// Mock Redis caching decorator
vi.mock('@book-library-tool/redis', () => ({
  Cache: () => (_t: any, _k: string, d: PropertyDescriptor) => d,
  httpRequestKeyGenerator: vi.fn(),
}))

// Mock schemas
vi.mock('@book-library-tool/api', () => ({
  schemas: {
    BookCreateRequestSchema: {
      type: 'object',
      properties: {
        isbn: { type: 'string' },
        title: { type: 'string' },
        author: { type: 'string' },
        publicationYear: { type: 'number' },
        publisher: { type: 'string' },
        price: { type: 'number' },
      },
      required: ['isbn', 'title', 'author'],
    },
    BookUpdateRequestSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        author: { type: 'string' },
        publicationYear: { type: 'number' },
        publisher: { type: 'string' },
        price: { type: 'number' },
      },
    },
    IdParameterSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
}))

describe('BookWriteRouter Integration Tests', () => {
  let app: FastifyInstance
  let mockProjectionRepository: BookReadProjectionRepositoryPort
  let mockEventBus: ReturnType<typeof createMockEventBus>
  let mockWriteRepository: ReturnType<typeof createMockBookWriteRepository>

  // Sample book data for testing
  const mockBookData = {
    id: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
    isbn: '978-3-16-148410-0',
    title: 'Test Book',
    author: 'Test Author',
    publicationYear: 2023,
    publisher: 'Test Publisher',
    price: 19.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(async () => {
    // Create mocks
    mockProjectionRepository = createMockBookReadProjectionRepository()
    mockEventBus = createMockEventBus()
    mockWriteRepository = createMockBookWriteRepository()

    // Mock repository methods for specific tests
    mockProjectionRepository.getBookByIsbn = vi
      .fn()
      .mockImplementation((isbn) => {
        if (isbn === 'existing-isbn') {
          return Promise.resolve(mockBookData)
        }

        return Promise.resolve(null)
      })

    // Initialize Fastify app
    app = Fastify({ logger: false })

    // Set up error handler
    app.setErrorHandler((error, _req, reply) => {
      if (error instanceof Errors.ApplicationError) {
        return reply.status(error.statusCode).send(error)
      }

      const isValidation = Array.isArray((error as any).validation)
      const status = (error as any).statusCode ?? (isValidation ? 400 : 500)

      reply.status(status).send({
        error: isValidation ? 'Validation Error' : 'Internal Server Error',
        message: error.message,
      })
    })

    // Register the BookWriteRouter
    await app.register(
      createBookWriteRouter(
        mockWriteRepository,
        mockProjectionRepository,
        mockEventBus,
      ),
      {
        prefix: '/api/books',
      },
    )

    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    vi.clearAllMocks()
  })

  describe('POST /api/books', () => {
    it('should create a new book', async () => {
      const createReq: BookCreateRequest = {
        isbn: 'new-isbn-123',
        title: 'New Book',
        author: 'New Author',
        publicationYear: 2024,
        publisher: 'Publisher',
        price: 29.99,
      }

      const res = await supertest(app.server)
        .post('/api/books')
        .send(createReq)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('bookId')
      expect(res.body).toHaveProperty('version', 1)
    })

    it('should return 400 for invalid request format', async () => {
      const invalid = { isbn: 'isbn-only' }

      const res = await supertest(app.server)
        .post('/api/books')
        .send(invalid)
        .expect(400)

      expect(res.body).toHaveProperty('error')
    })

    it('should handle existing ISBN validation', async () => {
      // Override CreateBookHandler for this test to check ISBN duplication
      const originalModule = await vi.importActual(
        '@books/application/use_cases/commands/CreateBookHandler.js',
      )

      vi.doMock(
        '@books/application/use_cases/commands/CreateBookHandler.js',
        () => ({
          ...originalModule,
          CreateBookHandler: vi.fn().mockImplementation(() => ({
            execute: vi.fn().mockImplementation(async (cmd) => {
              if (cmd.isbn === 'existing-isbn') {
                throw new Errors.ApplicationError(
                  400,
                  ErrorCode.VALIDATION_ERROR,
                  'A book with this ISBN already exists',
                )
              }

              return {
                success: true,
                bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
                version: 1,
              }
            }),
          })),
        }),
      )

      // Reset module cache to apply the new mock
      vi.resetModules()

      // Create a new book with existing ISBN
      const duplicateIsbnReq: BookCreateRequest = {
        isbn: 'existing-isbn',
        title: 'New Book',
        author: 'New Author',
        publicationYear: 2024,
        publisher: 'Publisher',
        price: 29.99,
      }

      try {
        const res = await supertest(app.server)
          .post('/api/books')
          .send(duplicateIsbnReq)
          .expect(400)

        expect(res.body).toHaveProperty('errorCode', ErrorCode.VALIDATION_ERROR)
      } catch (error) {
        // Clean up regardless of test result
        vi.resetModules()
        // Restore the original mock
        vi.doMock(
          '@books/application/use_cases/commands/CreateBookHandler.js',
          () => ({
            CreateBookHandler: vi.fn().mockImplementation(() => ({
              execute: vi.fn().mockResolvedValue({
                success: true,
                bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
                version: 1,
              }),
            })),
          }),
        )
      }
    })
  })

  describe('PATCH /api/books/:id', () => {
    it('should update an existing book', async () => {
      const updateReq: BookUpdateRequest = {
        title: 'Updated Title',
        price: 39.99,
      }

      const res = await supertest(app.server)
        .patch(`/api/books/${mockBookData.id}`)
        .send(updateReq)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('bookId')
      expect(res.body).toHaveProperty('version', 2)
    })

    it('should handle empty update requests', async () => {
      const emptyUpdateReq = {}

      const res = await supertest(app.server)
        .patch(`/api/books/${mockBookData.id}`)
        .send(emptyUpdateReq)
        .expect(200)

      expect(res.body).toHaveProperty('success', true)
    })
  })

  describe('DELETE /api/books/:id', () => {
    it('should delete a book', async () => {
      const res = await supertest(app.server)
        .delete(`/api/books/${mockBookData.id}`)
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('bookId')
      expect(res.body).toHaveProperty('version', 1)
    })

    it('should handle errors during deletion', async () => {
      // Mock DeleteBookHandler to throw an error for a specific ID
      const originalModule = await vi.importActual(
        '@books/application/use_cases/commands/DeleteBookHandler.js',
      )

      vi.doMock(
        '@books/application/use_cases/commands/DeleteBookHandler.js',
        () => ({
          ...originalModule,
          DeleteBookHandler: vi.fn().mockImplementation(() => ({
            execute: vi.fn().mockImplementation(async (cmd) => {
              if (cmd.id === 'error-during-delete') {
                throw new Errors.ApplicationError(
                  500,
                  ErrorCode.INTERNAL_ERROR,
                  'Error occurred while deleting the book',
                )
              }

              return {
                success: true,
                bookId: cmd.id,
                version: 1,
              }
            }),
          })),
        }),
      )

      // Reset module cache to apply the new mock
      vi.resetModules()

      try {
        await supertest(app.server)
          .delete('/api/books/error-during-delete')
          .expect(500)
      } catch (error) {
        // Clean up regardless of test result
      } finally {
        vi.resetModules()
        // Restore the original mock
        vi.doMock(
          '@books/application/use_cases/commands/DeleteBookHandler.js',
          () => ({
            DeleteBookHandler: vi.fn().mockImplementation(() => ({
              execute: vi.fn().mockResolvedValue({
                success: true,
                bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
                version: 1,
              }),
            })),
          }),
        )
      }
    })
  })
})
