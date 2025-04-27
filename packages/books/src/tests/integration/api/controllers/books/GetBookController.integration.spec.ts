import type { schemas } from '@book-library-tool/api'
import type { Book } from '@book-library-tool/sdk'
import { ErrorCode, Errors } from '@book-library-tool/shared'
import { createTestServer, setupSilentLogging } from '@book-library-tool/tests'
import { GetBookController } from '@books/api/index.js'
import type { FastifyInstance } from 'fastify'
import { pick } from 'lodash-es'
import supertest from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Silence Fastify error logs in tests
setupSilentLogging()

// Define a full sample Book
const fullBook: Book = {
  id: 'book-123',
  isbn: '978-3-16-148410-0',
  title: 'Test Book',
  author: 'Test Author',
  publicationYear: 2023,
  publisher: 'Test Publisher',
  price: 19.99,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Shared mock handler instance
const handler = {
  execute: vi.fn((query: { id: string }, fields?: schemas.BookSortField[]) => {
    if (query.id === 'non-existent-id') {
      throw new Errors.ApplicationError(
        404,
        ErrorCode.BOOK_NOT_FOUND,
        `Book with ID ${query.id} not found`,
      )
    }

    if (fields && fields.length) {
      return Promise.resolve(pick(fullBook, fields) as Book)
    }

    return Promise.resolve(fullBook)
  }),
}

describe('GetBookController Integration Tests', () => {
  let app: FastifyInstance

  // Initialize Fastify server at module load
  const { getApp } = createTestServer(async (fastify) => {
    const controller = new GetBookController(handler as any)

    fastify.get('/api/books/:id', async (request, reply) => {
      try {
        const result = await controller.getBook(request as any)

        return result
      } catch (error) {
        if (error instanceof Errors.ApplicationError) {
          return reply.status(error.statusCode).send(error)
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  })

  beforeEach(() => {
    app = getApp()
    handler.execute.mockClear()
  })

  it('retrieves a book by ID', async () => {
    const id = 'book-123'
    const res = await supertest(app.server)
      .get(`/api/books/${id}`)
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toMatchObject({
      id,
      isbn: fullBook.isbn,
      title: fullBook.title,
    })
    expect(handler.execute).toHaveBeenCalledWith({ id }, undefined)
  })

  it('filters returned fields when specified', async () => {
    const id = 'book-123'
    const fieldsParam = 'id,title,author'
    const expectedFields = ['id', 'title', 'author'] as const

    const res = await supertest(app.server)
      .get(`/api/books/${id}?fields=${fieldsParam}`)
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toEqual({
      id,
      title: fullBook.title,
      author: fullBook.author,
    })
    expect(handler.execute).toHaveBeenCalledWith({ id }, expectedFields)
  })

  it('returns 500 on handler errors', async () => {
    const id = 'error-id'

    handler.execute.mockRejectedValueOnce(new Error('Internal error'))

    const res = await supertest(app.server)
      .get(`/api/books/${id}`)
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toHaveProperty('error', 'Internal Server Error')
    expect(res.body).toHaveProperty('message', 'Internal error')
    expect(handler.execute).toHaveBeenCalledWith({ id }, undefined)
  })
})
