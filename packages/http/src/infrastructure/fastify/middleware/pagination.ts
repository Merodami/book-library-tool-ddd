import { logger } from '@book-library-tool/shared'
import { PaginatedQuery, PaginationMetadata } from '@book-library-tool/types'
import { FastifyRequest, onRequestHookHandler } from 'fastify'

/**
 * Extend FastifyRequest interface to include pagination
 */
declare module 'fastify' {
  interface FastifyRequest {
    pagination: PaginatedQuery
  }
}

/**
 * Fastify hook that processes pagination parameters from query strings
 *
 * @returns {onRequestHookHandler} Fastify onRequest hook handler
 */
export const paginationHook: onRequestHookHandler = async (
  request: FastifyRequest,
): Promise<void> => {
  // Apply limit constraints from environment variables or default values
  let limit: number = parseInt(process.env.PAGINATION_DEFAULT_LIMIT ?? '10')
  const maxLimit: number = parseInt(process.env.PAGINATION_MAX_LIMIT ?? '100')

  try {
    // Extract query parameters
    const query = request.query as Record<string, string>

    // Extract and compute the page number. Ensure it is at least 1
    const page: number = Math.max(1, query.page ? parseInt(query.page, 10) : 1)

    if (query.limit) {
      limit = parseInt(query.limit, 10)

      // Ensure the limit is within the allowed range
      limit = Math.max(1, Math.min(maxLimit, limit))
    }

    // Add pagination to the request object
    ;(request as any).pagination = {
      page,
      limit,
    }
  } catch (error: unknown) {
    // If any error occurs, default to the initial pagination values
    ;(request as any).pagination = {
      page: 1,
      limit,
    }

    // Log the error for debugging purposes
    logger.error('Error in pagination hook:', error)
  }
}

/**
 * Helper function for applying pagination to database queries
 *
 * @param pagination - The pagination object
 * @returns Object with skip and limit properties for database queries
 */
export function getPaginationParams(pagination: PaginationMetadata): {
  skip: number
  limit: number
} {
  return {
    skip: (pagination.page - 1) * pagination.limit,
    limit: pagination.limit,
  }
}
