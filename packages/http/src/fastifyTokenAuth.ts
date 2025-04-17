import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import jwt, { JwtPayload } from 'jsonwebtoken'

import { ApiTokenOptions } from './types.js'

// Type declaration to extend FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload
  }
}

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
    async (request: FastifyRequest, reply: FastifyReply) => {
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
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Missing API token',
        })
      }

      // Validate Bearer token format
      const [scheme, token] = authHeader.split(' ')
      if (scheme !== 'Bearer' || !token) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Invalid API token format',
        })
      }

      try {
        // Verify and decode the token
        const decoded = jwt.verify(token, secret) as JwtPayload
        request.user = decoded
      } catch (error) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Invalid API token',
        })
      }
    },
  )
})
