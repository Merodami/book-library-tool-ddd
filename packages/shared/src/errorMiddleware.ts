import type { ErrorRequestHandler } from 'express'

import { ApplicationError } from './errors.js'
import logger from './logger.js'

/**
 * This should be the last stop for errors.
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
export const errorMiddleware: ErrorRequestHandler = async (
  err: ApplicationError | Error,
  req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(err)
  }

  // (This will go to metrics like DD, Prometheus, etc.)
  logger.error(err)

  if (err instanceof ApplicationError) {
    res.status(err.status).json({
      status: err.status,
      message: err.message,
      content: err.content,
    })

    return
  }

  res.status(500).json({
    message: 'Internal Server Error',
    code: 500,
  })
}
