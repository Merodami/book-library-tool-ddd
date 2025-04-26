import {
  createMockEventResponse,
  createTestServer,
  setupSilentLogging,
} from '@book-library-tool/tests'
import { DeleteBookController } from '@books/api/index.js'
import type { DeleteBookCommand } from '@books/application/index.ts'
import type { FastifyInstance } from 'fastify'
import supertest from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Silence Fastify error logs in tests
setupSilentLogging()

// Shared mock handler instance
const handler = {
  execute: vi.fn((cmd: DeleteBookCommand) =>
    Promise.resolve(createMockEventResponse(cmd.id)),
  ),
}

describe('DeleteBookController Integration Tests', () => {
  let app: FastifyInstance

  // Initialize Fastify server at module load
  const { getApp } = createTestServer(async (fastify) => {
    const controller = new DeleteBookController(handler as any)

    fastify.delete('/api/books/:id', async (request, reply) => {
      try {
        return await controller.deleteBook(request as any)
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

  it('deletes an existing book successfully', async () => {
    const bookId = 'book-123'

    const res = await supertest(app.server)
      .delete(`/api/books/${bookId}`)
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toEqual({
      success: true,
      bookId,
      version: 1,
    })
    expect(handler.execute).toHaveBeenCalledWith({ id: bookId })
  })

  it('returns 404 when book not found', async () => {
    const id = 'non-existent'

    handler.execute.mockRejectedValueOnce({
      statusCode: 404,
      code: 'BOOK_NOT_FOUND',
      message: `Book with ID ${id} not found`,
    })

    const res = await supertest(app.server)
      .delete(`/api/books/${id}`)
      .expect('Content-Type', /json/)
      .expect(404)

    expect(res.body).toEqual({
      error: `Book with ID ${id} not found`,
      message: `Book with ID ${id} not found`,
    })
    expect(handler.execute).toHaveBeenCalledWith({ id })
  })

  it('returns 410 when already deleted', async () => {
    const id = 'already-deleted'

    handler.execute.mockRejectedValueOnce({
      statusCode: 410,
      code: 'BOOK_ALREADY_DELETED',
      message: `Book with ID ${id} already deleted`,
    })

    const res = await supertest(app.server)
      .delete(`/api/books/${id}`)
      .expect('Content-Type', /json/)
      .expect(410)

    expect(res.body).toEqual({
      error: `Book with ID ${id} already deleted`,
      message: `Book with ID ${id} already deleted`,
    })
    expect(handler.execute).toHaveBeenCalledWith({ id })
  })

  it('returns 500 on internal errors', async () => {
    const id = 'error-id'

    handler.execute.mockRejectedValueOnce(new Error('Server error'))

    const res = await supertest(app.server)
      .delete(`/api/books/${id}`)
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toEqual({
      error: 'Server error',
      message: 'Server error',
    })
    expect(handler.execute).toHaveBeenCalledWith({ id })
  })
})
