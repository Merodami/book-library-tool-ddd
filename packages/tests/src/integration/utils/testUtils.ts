import { logger } from '@book-library-tool/shared'
import Fastify, { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, vi } from 'vitest'

/**
 * Creates a test Fastify server and handles setup/teardown
 * @param setupCallback Function to register routes and controllers
 * @returns Object with app instance and test lifecycle hooks
 */
export function createTestServer(
  setupCallback: (app: FastifyInstance) => Promise<void>,
) {
  let app: FastifyInstance

  beforeAll(async () => {
    // Create Fastify app
    app = Fastify({
      logger: false, // Disable logging in tests
    })

    // Add common plugins if needed
    // app.register(require('@fastify/cors'))

    // Error handler for tests
    app.setErrorHandler((error, request, reply) => {
      if (error.validation) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          details: error.validation,
        })
      }

      // Log the error for debugging test failures
      logger.error('Test server error:', error)

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message,
      })
    })

    // Let the test setup its routes
    await setupCallback(app)

    // Ready the server
    await app.ready()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  return { getApp: () => app }
}

/**
 * Creates a mock event response for testing
 * @param bookId ID of the book
 * @param version Version number
 */
export function createMockEventResponse(bookId: string, version: number = 1) {
  return {
    success: true,
    bookId,
    version,
  }
}

/**
 * Resets all mocks between tests
 */
export function resetMocks() {
  vi.clearAllMocks()
}
