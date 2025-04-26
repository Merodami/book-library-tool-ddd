import { setupSilentLogging } from '@book-library-tool/tests'
import { createCatalogReadRouter } from '@books/api/routes/catalog/CatalogReadRouter.js'
import type { BookReadProjectionRepositoryPort } from '@books/domain/index.js'
import { createMockBookReadProjectionRepository } from '@books/tests/mocks/index.js'
import Fastify, { FastifyInstance } from 'fastify'
import { set } from 'lodash-es'
import { get } from 'lodash-es'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Set environment variables for test mode to silence logging
setupSilentLogging()

// Mock the schemas
vi.mock('@book-library-tool/api', () => ({
  schemas: {
    CatalogSearchQuerySchema: {
      type: 'object',
      properties: {
        page: { type: 'number' },
        limit: { type: 'number' },
        fields: { type: 'string' },
        title: { type: 'string' },
        author: { type: 'string' },
        publisher: { type: 'string' },
        isbn: { type: 'string' },
        publicationYear: { type: 'number' },
        price: { type: 'number' },
        sortBy: { type: 'string' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'] },
      },
    },
  },
}))

// Mock Redis caching decorator
vi.mock('@book-library-tool/redis', () => ({
  Cache: () => (_t: any, _k: string, d: PropertyDescriptor) => d,
  httpRequestKeyGenerator: vi.fn(),
}))

// Only mock the specific functions needed for testing
vi.mock('@book-library-tool/http', async () => {
  // Import the original module
  const originalModule = (await vi.importActual(
    '@book-library-tool/http',
  )) as any

  // Return modified module with only the functions we need to mock
  return {
    ...originalModule, // Keep all original implementations, including makeValidator
    // Only override the specific functions needed for the test
    paginationHook: vi.fn().mockImplementation((req, reply, done) => {
      // Set default pagination values if not provided
      req.query = {
        ...req.query,
        page: req.query.page || 1,
        limit: req.query.limit || 10,
      }
      done()
    }),
    parseAndValidate: vi
      .fn()
      .mockImplementation((fieldsParam, allowedFields) => {
        if (!fieldsParam) return null

        return fieldsParam
          .split(',')
          .filter((field: string) => allowedFields.includes(field))
      }),
    // Note: We're NOT overriding makeValidator, so the original will be used
  }
})

describe('CatalogReadRouter Integration Tests', () => {
  let app: FastifyInstance
  let mockProjectionRepository: BookReadProjectionRepositoryPort

  // Sample book data for testing
  const sampleBooks = [
    {
      id: '5a0e8b9b-e53a-429c-8022-c888d29b998c',
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Test Author',
      publicationYear: 2023,
      publisher: 'Test Publisher',
      price: 19.99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '6b1f9c0c-f64b-53ad-9133-d999e30a009d',
      isbn: '978-3-16-148410-1',
      title: 'Another Book',
      author: 'Another Author',
      publicationYear: 2024,
      publisher: 'Another Publisher',
      price: 29.99,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  beforeEach(async () => {
    // Create a mock repository for testing
    mockProjectionRepository = createMockBookReadProjectionRepository()

    // Mock the getAllBooks method to return our sample data
    mockProjectionRepository.getAllBooks = vi.fn().mockResolvedValue({
      data: sampleBooks,
      pagination: {
        total: sampleBooks.length,
        page: 1,
        limit: 10,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    })

    // Initialize the Fastify app
    app = Fastify({ logger: false })

    // Setup error handler
    app.setErrorHandler((error, _req, reply) => {
      const isValidation = Array.isArray((error as any).validation)
      const status = (error as any).statusCode ?? (isValidation ? 400 : 500)

      reply.status(status).send({ error: error.message })
    })

    // Register the catalog router
    await app.register(createCatalogReadRouter(mockProjectionRepository), {
      prefix: '/api/catalog',
    })

    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    vi.clearAllMocks()
  })

  describe('GET /api/catalog', () => {
    it('should retrieve a list of books', async () => {
      const res = await supertest(app.server)
        .get('/api/catalog')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('pagination')
      expect(res.body.data).toHaveLength(2)
      expect(res.body.data[0]).toHaveProperty('id', sampleBooks[0].id)
      expect(mockProjectionRepository.getAllBooks).toHaveBeenCalled()
    })

    it('should support pagination parameters', async () => {
      const res = await supertest(app.server)
        .get('/api/catalog?page=2&limit=1')
        .expect(200)

      expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 1,
        }),
        undefined,
      )
    })

    it('should support field selection', async () => {
      const fieldsParam = 'id,title,author'
      const expectedFields = ['id', 'title', 'author']

      // Mock the getAllBooks method to return filtered fields
      mockProjectionRepository.getAllBooks = vi
        .fn()
        .mockImplementation(async (query, fields) => ({
          data: sampleBooks.map((book) => {
            const result: Record<string, any> = {}

            fields?.forEach((field: string) => {
              set(result, field, get(book, field))
            })

            return result
          }),
          pagination: {
            total: sampleBooks.length,
            page: 1,
            limit: 10,
            pages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }))

      const res = await supertest(app.server)
        .get(`/api/catalog?fields=${fieldsParam}`)
        .expect(200)

      expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({ fields: fieldsParam }),
        expect.arrayContaining(expectedFields),
      )

      // Each book should only have the requested fields
      res.body.data.forEach((book: any) => {
        expect(Object.keys(book)).toHaveLength(expectedFields.length)
        expectedFields.forEach((field) => {
          expect(book).toHaveProperty(field)
        })
      })
    })

    it('should support filtering by title', async () => {
      const title = 'Test'

      // Mock repository to filter by title
      mockProjectionRepository.getAllBooks = vi
        .fn()
        .mockImplementation(async (query) => ({
          data: sampleBooks.filter((book) =>
            book.title.toLowerCase().includes(query.title.toLowerCase()),
          ),
          pagination: {
            total: 1,
            page: 1,
            limit: 10,
            pages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }))

      const res = await supertest(app.server)
        .get(`/api/catalog?title=${title}`)
        .expect(200)

      expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({ title }),
        undefined,
      )
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].title).toContain(title)
    })

    it('should support sorting', async () => {
      const sortBy = 'price'
      const sortOrder = 'desc'

      await supertest(app.server)
        .get(`/api/catalog?sortBy=${sortBy}&sortOrder=${sortOrder}`)
        .expect(200)

      expect(mockProjectionRepository.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy,
          sortOrder,
        }),
        undefined,
      )
    })

    it('should handle repository errors gracefully', async () => {
      // Mock repository to throw an error
      mockProjectionRepository.getAllBooks = vi
        .fn()
        .mockRejectedValue(new Error('Database connection error'))

      const res = await supertest(app.server).get('/api/catalog').expect(500)

      expect(res.body).toHaveProperty('error')
    })
  })
})
