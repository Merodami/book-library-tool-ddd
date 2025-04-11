import { NextFunction, Request as ExpressRequest, Response } from 'express'

/**
 * Express middleware to extract and normalize pagination parameters from query parameters.
 * It adds a standardized `pagination` object to the request that contains `page` and `limit` values.
 *
 * @returns { (req: Request, res: Response, next: NextFunction) => void } Middleware function.
 */
export const paginationMiddleware = () => {
  return (req: ExpressRequest, res: Response, next: NextFunction): void => {
    // Apply limit constraints from environment variables or default values.
    let limit: number = Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10
    const maxLimit: number = Number(process.env.PAGINATION_MAX_LIMIT) || 100

    try {
      // Extract and compute the page number. Ensure it is at least 1.
      const page: number = Math.max(
        1,
        req.query.page ? parseInt(req.query.page as string, 10) : 1,
      )

      if (req.query.limit) {
        limit = parseInt(req.query.limit as string, 10)

        // Ensure the limit is within the allowed range.
        limit = Math.max(1, Math.min(maxLimit, limit))
      }

      // Assign the computed pagination values to the request object.
      req.pagination = {
        page,
        limit,
      }

      next()
    } catch (error: unknown) {
      // If any error occurs, default to the initial pagination values.
      req.pagination = {
        page: 1,
        limit,
      }

      // Log the error for debugging purposes.
      console.error('Error in pagination middleware:', error)

      next()
    }
  }
}

/**
 * Augments the Express Request interface to include a `pagination` property.
 * This allows TypeScript to recognize that the middleware adds a `pagination` object to the request.
 */
declare global {
  namespace Express {
    interface Request {
      pagination: {
        page: number
        limit: number
      }
    }
  }
}
