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

  if (err instanceof ApplicationError) {
    res.status(err.status).json({
      message: err.message,
      code: err.status,
      data: err.content,
    })
    return // ensure nothing is returned
  }

  if (err.name === 'EntityNotFound') {
    res.status(404).json({
      message: 'Not found.',
      code: 404,
    })
    return
  }

  res.status(500).json({
    message: 'Internal Server Error',
    code: 500,
  })
}
