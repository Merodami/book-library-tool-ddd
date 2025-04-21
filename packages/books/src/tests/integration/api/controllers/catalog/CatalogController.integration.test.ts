import { schemas } from '@book-library-tool/api'
import type { Book, PaginatedBookResponse } from '@book-library-tool/sdk'
import { logger } from '@book-library-tool/shared'
import { createTestServer } from '@book-library-tool/tests'
import { CatalogController } from '@books/controllers/catalog/CatalogController.js'
import { GetAllBooksHandler } from '@books/queries/GetAllBooksHandler.js'
import type { IBookProjectionRepository } from '@books/repositories/IBookProjectionRepository.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { pick } from 'lodash-es'
import supertest from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Silence Fastify error logs in tests
beforeAll(() => {
  vi.spyOn(logger, 'error').mockImplementation(() => {})
})

// Mock the Cache decorator so it’s a no-op
vi.mock('@book-library-tool/redis', () => ({
  Cache: () => (_target: any, _key: string, descriptor: PropertyDescriptor) =>
    descriptor,
  httpRequestKeyGenerator: vi.fn(),
}))

// Sample in-memory books
const sampleBooks: Book[] = [
  {
    id: 'book-1',
    isbn: '978-3-16-148410-0',
    title: 'Book One',
    author: 'Author One',
    publicationYear: 2023,
    publisher: 'Publisher A',
    price: 19.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'book-2',
    isbn: '978-3-16-148410-1',
    title: 'Second Book',
    author: 'Author Two',
    publicationYear: 2024,
    publisher: 'Publisher B',
    price: 29.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Fully mocked projection repository
const mockRepo: IBookProjectionRepository = {
  getAllBooks: vi
    .fn()
    .mockImplementation(
      async (
        query: schemas.CatalogSearchQuery,
        fields?: (keyof Book)[],
      ): Promise<PaginatedBookResponse> => {
        let filtered = [...sampleBooks]

        // Text filters
        if (query.title) {
          filtered = filtered.filter((b) =>
            b
              .title!.toLowerCase()
              .includes((query.title as string).toLowerCase()),
          )
        }
        if (query.author) {
          filtered = filtered.filter((b) =>
            b
              .author!.toLowerCase()
              .includes((query.author as string).toLowerCase()),
          )
        }

        // Range filters
        if (query.publicationYearMin !== undefined) {
          filtered = filtered.filter(
            (b) => b.publicationYear! >= Number(query.publicationYearMin),
          )
        }
        if (query.publicationYearMax !== undefined) {
          filtered = filtered.filter(
            (b) => b.publicationYear! <= Number(query.publicationYearMax),
          )
        }
        if (query.priceMin !== undefined) {
          filtered = filtered.filter((b) => b.price! >= Number(query.priceMin))
        }
        if (query.priceMax !== undefined) {
          filtered = filtered.filter((b) => b.price! <= Number(query.priceMax))
        }

        // Field selection using lodash.pick
        if (fields && fields.length) {
          filtered = filtered.map((b) => pick(b, fields) as Book)
        }

        const page = Number(query.page ?? 1)
        const limit = Number(query.limit ?? 10)
        const total = filtered.length

        return {
          data: filtered,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        }
      },
    ),

  // Unused by this controller
  getBookById: vi.fn(),
  getBookByIsbn: vi.fn(),
  saveProjection: vi.fn(),
  updateProjection: vi.fn(),
  markAsDeleted: vi.fn(),
  findBookForReservation: vi.fn(),
}

// Wire up test server at module scope
const handler = new GetAllBooksHandler(mockRepo)
const { getApp } = createTestServer(async (app) => {
  const ctrl = new CatalogController(handler)

  app.get('/catalog', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await ctrl.getAllBooks(req)
    } catch {
      reply.status(500).send({ error: 'Internal Server Error' })
    }
  })
})

describe('CatalogController Integration Tests', () => {
  let fastify: FastifyInstance

  beforeEach(() => {
    vi.clearAllMocks()
    fastify = getApp()
  })

  it('returns default paginated list', async () => {
    const res = await supertest(fastify.server).get('/catalog').expect(200)

    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.pagination.page).toBe(1)
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(
      expect.objectContaining({}),
      undefined,
    )
  })

  it('handles page & limit', async () => {
    const res = await supertest(fastify.server)
      .get('/catalog?page=2&limit=1')
      .expect(200)

    expect(res.body.pagination.page).toBe(2)
    expect(res.body.pagination.limit).toBe(1)
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(
      expect.objectContaining({ page: '2', limit: '1' }),
      undefined,
    )
  })

  it('filters by title and author', async () => {
    await supertest(fastify.server)
      .get('/catalog?title=Book&author=Author%20One')
      .expect(200)
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Book', author: 'Author One' }),
      undefined,
    )
  })

  it('applies publicationYear range filter', async () => {
    await supertest(fastify.server)
      .get('/catalog?publicationYearMin=2023&publicationYearMax=2023')
      .expect(200)
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(
      expect.objectContaining({
        publicationYearMin: '2023',
        publicationYearMax: '2023',
      }),
      undefined,
    )
  })

  it('applies price range filter', async () => {
    await supertest(fastify.server)
      .get('/catalog?priceMin=20&priceMax=30')
      .expect(200)
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: '20', priceMax: '30' }),
      undefined,
    )
  })

  it('limits returned fields with comma-separated param', async () => {
    const res = await supertest(fastify.server)
      .get('/catalog?fields=id,title')
      .expect(200)

    expect(Object.keys(res.body.data[0]).sort()).toEqual(['id', 'title'])
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(expect.any(Object), [
      'id',
      'title',
    ])
  })

  it('ignores invalid fields and returns full objects', async () => {
    const res = await supertest(fastify.server)
      .get('/catalog?fields=foo,bar')
      .expect(200)
    const expectedKeyCount = Object.keys(sampleBooks[0]).length

    expect(Object.keys(res.body.data[0])).toHaveLength(expectedKeyCount)
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
    )
  })

  it('handles sortBy & sortOrder', async () => {
    await supertest(fastify.server)
      .get('/catalog?sortBy=price&sortOrder=DESC')
      .expect(200)
    expect(mockRepo.getAllBooks).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'price', sortOrder: 'DESC' }),
      undefined,
    )
  })

  it('returns 500 on handler exception', async () => {
    ;(mockRepo.getAllBooks as any).mockRejectedValueOnce(new Error('boom'))

    const res = await supertest(fastify.server).get('/catalog').expect(500)

    expect(res.body).toEqual({ error: 'Internal Server Error' })
  })

  it('returns empty when no matches', async () => {
    ;(mockRepo.getAllBooks as any).mockResolvedValueOnce({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      },
    })

    const res = await supertest(fastify.server).get('/catalog').expect(200)

    expect(res.body.data).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })
})
