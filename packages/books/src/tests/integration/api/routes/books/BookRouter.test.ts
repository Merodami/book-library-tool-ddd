import { EventBus } from '@book-library-tool/event-store'
import { BookCreateRequest, BookUpdateRequest } from '@book-library-tool/sdk'
import { logger } from '@book-library-tool/shared'
import { resetMocks } from '@book-library-tool/tests'
import type { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import type { IBookRepository } from '@books/repositories/IBookRepository.js'
import { createBookRouter } from '@books/routes/books/BookRouter.js'
import Fastify, { FastifyInstance } from 'fastify'
import supertest from 'supertest'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

// Silence Fastify error logs in tests
beforeAll(() => {
  vi.spyOn(logger, 'error').mockImplementation(() => {})
})

// --------------------------
// Short-circuit real handlers
// --------------------------
vi.mock('@books/commands/CreateBookHandler.js', () => ({
  CreateBookHandler: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
      version: 1,
    }),
  })),
}))
vi.mock('@books/commands/UpdateBookHandler.js', () => ({
  UpdateBookHandler: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      bookId: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
      version: 2,
    }),
  })),
}))
vi.mock('@books/commands/DeleteBookHandler.js', () => ({
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

describe('Book Router Integration Tests', () => {
  let app: FastifyInstance
  let mockBookRepository: IBookRepository
  let mockProjectionRepository: IBookProjectionRepository
  let mockEventBus: EventBus

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
    resetMocks()

    mockBookRepository = {
      findAggregateIdById: vi
        .fn()
        .mockResolvedValue('5a0e8b9b-e53a-429c-8022-c888d29b998c'),
      getEventsForAggregate: vi.fn().mockResolvedValue([{}]),
      saveEvents: vi.fn().mockResolvedValue(undefined),
      appendBatch: vi.fn().mockResolvedValue(undefined),
      getById: vi.fn().mockResolvedValue(null),
    } as unknown as IBookRepository

    mockProjectionRepository = {
      getBookById: vi
        .fn()
        .mockImplementation(async (id) =>
          id === mockBookData.id ? mockBookData : null,
        ),
      getBookByIsbn: vi.fn().mockResolvedValue(mockBookData),
      getAllBooks: vi.fn().mockResolvedValue({
        data: [mockBookData],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }),
      saveProjection: vi.fn().mockResolvedValue(undefined),
      updateProjection: vi.fn().mockResolvedValue(undefined),
      markAsDeleted: vi.fn().mockResolvedValue(undefined),
    } as unknown as IBookProjectionRepository

    mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      init: vi.fn(),
      subscribe: vi.fn(),
      subscribeToAll: vi.fn(),
      unsubscribe: vi.fn(),
      shutdown: vi.fn(),
      startConsuming: vi.fn(),
      bindEventTypes: vi.fn(),
      checkHealth: vi.fn(),
    } as unknown as EventBus

    app = Fastify({ logger: false })

    app.setErrorHandler((error, _req, reply) => {
      const isValidation = Array.isArray((error as any).validation)
      const status = (error as any).statusCode ?? (isValidation ? 400 : 500)

      reply.status(status).send({ error: error.message })
    })

    await app.register(
      createBookRouter(
        mockBookRepository,
        mockProjectionRepository,
        mockEventBus,
      ),
      { prefix: '/api/books' },
    )
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('POST /api/books', () => {
    it('should create a new book', async () => {
      mockProjectionRepository.getBookByIsbn = vi.fn().mockResolvedValue(null)

      const createReq: BookCreateRequest = {
        isbn: mockBookData.isbn,
        title: 'New Book',
        author: 'New Author',
        publicationYear: 2024,
        publisher: 'Pub',
        price: 9.99,
      }

      const res = await supertest(app.server)
        .post('/api/books')
        .send(createReq)
        .expect(200)

      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('bookId')
      expect(res.body).toHaveProperty('version')
    })

    it('should return 400 for invalid request format', async () => {
      const invalid = { isbn: mockBookData.isbn }

      await supertest(app.server).post('/api/books').send(invalid).expect(400)
    })
  })

  describe('GET /api/books/:id', () => {
    it('should get a book by ID', async () => {
      const res = await supertest(app.server)
        .get(`/api/books/${mockBookData.id}`)
        .expect(200)

      expect(res.body).toEqual(mockBookData)
    })

    it('should return 404 for non-existent book', async () => {
      mockProjectionRepository.getBookById = vi.fn().mockResolvedValue(null)

      await supertest(app.server).get('/api/books/nope').expect(400)
    })
  })

  describe('PATCH /api/books/:id', () => {
    it('should update an existing book', async () => {
      const updateReq: BookUpdateRequest = { title: 'Updated', price: 5 }
      const res = await supertest(app.server)
        .patch(`/api/books/${mockBookData.id}`)
        .send(updateReq)
        .expect(200)

      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('bookId')
      expect(res.body).toHaveProperty('version')
    })
  })

  describe('DELETE /api/books/:id', () => {
    it('should delete a book', async () => {
      const res = await supertest(app.server)
        .delete(`/api/books/${mockBookData.id}`)
        .expect(200)

      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('bookId')
      expect(res.body).toHaveProperty('version')
    })
  })
})
