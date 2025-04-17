import { ErrorCode, Errors, logger } from '@book-library-tool/shared'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import jwt, { JwtPayload } from 'jsonwebtoken'

import { ApiTokenOptions } from '../../../domain/types/server.js'

/**
 * API token authentication plugin for Fastify.
 * Validates JWT tokens in request headers and attaches the decoded payload to request.user.
 */
export const fastifyAuth = fp(async function (
  fastify: FastifyInstance,
  options: ApiTokenOptions,
) {
  const { secret, headerName = 'Authorization', excludePaths = [] } = options

  // Decorate request with user property
  fastify.decorateRequest('user', undefined)

  // Add authentication hook
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      // Skip authentication for excluded paths
      if (
        excludePaths.some((pattern) => {
          if (pattern === request.url) return true
          if (
            pattern.endsWith('*') &&
            request.url.startsWith(pattern.slice(0, -1))
          )
            return true
          return false
        })
      ) {
        return
      }

      const authHeader = request.headers[headerName.toLowerCase()]

      if (!authHeader || typeof authHeader !== 'string') {
        logger.info('Missing API token', { authHeader })

        throw new Errors.ApplicationError(
          401,
          ErrorCode.UNAUTHORIZED,
          'Missing API token',
        )
      }

      // Validate Bearer token format
      const [scheme, token] = authHeader.split(' ')
      if (scheme !== 'Bearer' || !token) {
        logger.info('Invalid API token format', { authHeader })

        throw new Errors.ApplicationError(
          401,
          ErrorCode.UNAUTHORIZED,
          'Invalid API token format',
        )
      }

      try {
        // Verify and decode the token
        const decoded = jwt.verify(token, secret) as JwtPayload

        request.user = decoded
      } catch (error) {
        logger.info('Invalid API token', { error })

        throw new Errors.ApplicationError(
          401,
          ErrorCode.UNAUTHORIZED,
          'Invalid API token',
        )
      }
    },
  )
})
