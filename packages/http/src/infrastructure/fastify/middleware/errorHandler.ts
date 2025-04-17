import { Errors } from '@book-library-tool/shared'
import { logger } from '@book-library-tool/shared'
import { FastifyError, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

/**
 * Options for the error middleware
 */
export interface ErrorMiddlewareOptions {
  enableStackTrace?: boolean
}

/**
 * Shared error handling middleware for Fastify applications.
 * This plugin sets up a global error handler that consistently formats errors across services.
 */
export const fastifyErrorMiddleware = fp(function (
  fastify: FastifyInstance,
  options: ErrorMiddlewareOptions,
  done,
) {
  // Default to showing stack traces in non-production environments
  const enableStackTrace =
    typeof options.enableStackTrace !== 'undefined'
      ? options.enableStackTrace
      : process.env.NODE_ENV !== 'production'

  // Set global error handler
  fastify.setErrorHandler((error, request, reply) => {
    // Skip if headers already sent
    if (reply.sent) {
      return
    }

    // Log the error (will go to metrics systems like DD, Prometheus, etc.)
    logger.error(`Error: ${error.message}`, {
      path: request.url,
      method: request.method,
      ...(enableStackTrace ? { stack: error.stack } : {}),
    })

    // Handle ApplicationError (custom error class)
    if (Errors.ApplicationError.isApplicationError(error)) {
      return reply.status(error.status).send({
        status: error.status,
        message: error.message,
        content: error.content,
      })
    }

    // Handle Fastify validation errors
    if ((error as FastifyError).validation) {
      return reply.status(400).send({
        status: 400,
        message: 'Validation Error',
        content: (error as FastifyError).validation,
      })
    }

    // Get status code from error if available
    const statusCode =
      'statusCode' in error ? (error.statusCode as number) : 500

    // Format the error response
    const response = {
      status: statusCode,
      message: statusCode === 500 ? 'Internal Server Error' : error.message,
      ...(enableStackTrace && statusCode === 500 ? { stack: error.stack } : {}),
    }

    reply.status(statusCode).send(response)
  })

  done()
})
