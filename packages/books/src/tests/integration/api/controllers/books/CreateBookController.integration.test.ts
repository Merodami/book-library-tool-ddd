import { EventResponse } from '@book-library-tool/sdk'
import { createTestServer } from '@book-library-tool/tests'
import type { CreateBookCommand } from '@books/commands/CreateBookCommand.js'
import { CreateBookController } from '@books/controllers/books/CreateBookController.js'
import type { FastifyInstance } from 'fastify'
import supertest from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Silence Fastify error logs in tests
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// Shared mock handler instance
const handler = {
  execute: vi.fn().mockResolvedValue({
    success: true,
    id: '5a1018f2-3526-4275-a84b-784e4f2e5a10',
    version: 1,
  } as EventResponse & { id: string }),
}

describe('CreateBookController Integration Tests', () => {
  let app: FastifyInstance

  // Initialize Fastify server at module load
  const { getApp } = createTestServer(async (fastify) => {
    // Use our shared handler
    const controller = new CreateBookController(handler as any)

    fastify.post('/api/books', async (request, _reply) => {
      return controller.createBook(request as any)
    })
  })

  beforeEach(() => {
    app = getApp()
    handler.execute.mockClear()
  })

  it('creates a new book successfully', async () => {
    const cmd: CreateBookCommand = {
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Author X',
      publicationYear: 2023,
      publisher: 'Pub X',
      price: 9.99,
    }

    const res = await supertest(app.server)
      .post('/api/books')
      .send(cmd)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toMatchObject({
      success: true,
      id: expect.any(String),
      version: 1,
    })
    expect(handler.execute).toHaveBeenCalledWith(cmd)
  })

  it('returns 500 and message on handler validation error', async () => {
    handler.execute.mockRejectedValueOnce({
      message: 'Missing required fields',
    })

    const partial = { isbn: '978-3-16-148410-0' }

    const res = await supertest(app.server)
      .post('/api/books')
      .send(partial)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body.error).toBe('Internal Server Error')
    expect(res.body.message).toBe('Missing required fields')
    expect(handler.execute).toHaveBeenCalledWith(partial as any)
  })

  it('returns 500 and message on duplicate ISBN', async () => {
    const duplicate: CreateBookCommand = {
      isbn: '978-3-16-148410-0',
      title: 'Dup',
      author: 'Dup',
      publicationYear: 2023,
      publisher: 'Dup Pub',
      price: 12.5,
    }

    handler.execute.mockRejectedValueOnce({
      message: `Book with ISBN ${duplicate.isbn} already exists`,
    })

    const res = await supertest(app.server)
      .post('/api/books')
      .send(duplicate)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body.error).toBe('Internal Server Error')
    expect(res.body.message).toContain(duplicate.isbn)
  })

  it('returns 500 on unexpected errors', async () => {
    handler.execute.mockRejectedValueOnce(new Error('Something went wrong'))

    const cmd: CreateBookCommand = {
      isbn: '978-3-16-148410-0',
      title: 'Err Book',
      author: 'Err Author',
      publicationYear: 2023,
      publisher: 'Err Pub',
      price: 15.0,
    }

    const res = await supertest(app.server)
      .post('/api/books')
      .send(cmd)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body.error).toBe('Internal Server Error')
    expect(res.body.message).toBe('Something went wrong')
  })
})
