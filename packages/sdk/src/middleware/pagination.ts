import { Request, Response, NextFunction } from 'express'
import { PaginationParams } from '@book-library-tool/types'

/**
 * Middleware that extracts and normalizes pagination parameters from query params
 * This adds a standardized pagination object to the request
 */
export const paginationMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Apply limit constraints
    let limit = Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10
    let maxLimit = Number(process.env.PAGINATION_MAX_LIMIT) || 10

    try {
      // Extract pagination parameters
      const page = Math.max(
        1,
        req.query.page ? parseInt(req.query.page as string, 10) : 1,
      )

      if (req.query.limit) {
        limit = parseInt(req.query.limit as string, 10)
        limit = Math.max(1, Math.min(maxLimit, limit))
      }

      // Add pagination to request object for use in handlers
      req.pagination = {
        page,
        limit,
      }

      next()
    } catch (error) {
      // If parsing fails, use default values
      req.pagination = {
        page: 1,
        limit,
      }

      next()
    }
  }
}

// Add to Request interface to make TypeScript aware of the pagination property
declare global {
  namespace Express {
    interface Request {
      pagination: PaginationParams
    }
  }
}
