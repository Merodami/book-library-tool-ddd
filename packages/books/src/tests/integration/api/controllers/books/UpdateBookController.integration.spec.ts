import {
  createMockEventResponse,
  createTestServer,
  setupSilentLogging,
} from '@book-library-tool/tests'
import { UpdateBookController } from '@books/api/index.js'
import type { UpdateBookCommand } from '@books/application/index.ts'
import type { FastifyInstance } from 'fastify'
import supertest from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Silence Fastify error logs in tests
setupSilentLogging()

// Shared mock handler instance
const handler = {
  execute: vi.fn((cmd: UpdateBookCommand) =>
    Promise.resolve(createMockEventResponse(cmd.id, /*version*/ 2)),
  ),
}

describe('UpdateBookController Integration Tests', () => {
  let app: FastifyInstance

  // Set up Fastify server once
  const { getApp } = createTestServer(async (fastify) => {
    const controller = new UpdateBookController(handler as any)

    fastify.patch('/api/books/:id', async (request, reply) => {
      try {
        return await controller.updateBook(request as any)
      } catch (err: any) {
        const status = err.statusCode ?? 500
        const message = err.message ?? 'Internal Server Error'

        return reply.status(status).send({ error: message, message })
      }
    })
  })

  beforeEach(() => {
    app = getApp()
    handler.execute.mockClear()
  })

  it('updates a book fully and returns success', async () => {
    const id = 'book-123'
    const updateData = {
      title: 'Updated Title',
      author: 'Updated Author',
      publicationYear: 2024,
      publisher: 'Updated Publisher',
      price: 29.99,
    }

    const res = await supertest(app.server)
      .patch(`/api/books/${id}`)
      .send(updateData)
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toEqual({
      success: true,
      bookId: id,
      version: 2,
    })
    expect(handler.execute).toHaveBeenCalledWith({ id, ...updateData })
  })

  it('handles partial updates', async () => {
    const id = 'book-123'
    const partial = { title: 'New Title', price: 15.5 }

    await supertest(app.server)
      .patch(`/api/books/${id}`)
      .send(partial)
      .expect('Content-Type', /json/)
      .expect(200)

    expect(handler.execute).toHaveBeenCalledWith({ id, ...partial })
  })

  it('returns 404 when book not found', async () => {
    const id = 'non-existent'
    const data = { title: 'X' }

    handler.execute.mockRejectedValueOnce({
      statusCode: 404,
      code: 'BOOK_NOT_FOUND',
      message: `Book with ID ${id} not found`,
    })

    const res = await supertest(app.server)
      .patch(`/api/books/${id}`)
      .send(data)
      .expect('Content-Type', /json/)
      .expect(404)

    expect(res.body).toEqual({
      error: `Book with ID ${id} not found`,
      message: `Book with ID ${id} not found`,
    })
    expect(handler.execute).toHaveBeenCalledWith({ id, ...data })
  })

  it('returns 400 on validation errors', async () => {
    const id = 'book-123'
    const invalid = { publicationYear: 'abc' }

    handler.execute.mockRejectedValueOnce({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid publication year',
    })

    const res = await supertest(app.server)
      .patch(`/api/books/${id}`)
      .send(invalid)
      .expect('Content-Type', /json/)
      .expect(400)

    expect(res.body).toEqual({
      error: 'Invalid publication year',
      message: 'Invalid publication year',
    })
    expect(handler.execute).toHaveBeenCalledWith({ id, ...invalid })
  })

  it('returns 500 on internal errors', async () => {
    const id = 'error-id'
    const data = { title: 'X' }

    handler.execute.mockRejectedValueOnce(new Error('Server error'))

    const res = await supertest(app.server)
      .patch(`/api/books/${id}`)
      .send(data)
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toEqual({
      error: 'Server error',
      message: 'Server error',
    })
    expect(handler.execute).toHaveBeenCalledWith({ id, ...data })
  })
})
