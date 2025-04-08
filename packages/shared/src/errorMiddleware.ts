import type { ErrorRequestHandler } from 'express'
import logger from './logger.js'
import { ApplicationError } from './errors.js'

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

  logger.error(err)
  console.log('🚀 ~ err instanceof ApplicationError:', err)

  if (err instanceof ApplicationError) {
    res.status(err.status).json({
      message: err.message,
      code: err.status,
      data: err.content,
    })
    return // ensure nothing is returned
  }

  res.status(500).json({
    message: 'Internal Server Error',
    code: 500,
  })
}
