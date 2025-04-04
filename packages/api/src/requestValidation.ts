// validateRequest.ts
import { Ajv } from 'ajv'
import { Request, Response, NextFunction } from 'express'
import _addFormats from 'ajv-formats'
import { formatApiErrors } from './util/formatApiError.js'

// Import the Ajv formats plugin fix (cannot import directly AddFormat)
const addFormats = _addFormats as unknown as typeof _addFormats.default

// Initialize Ajv with all errors enabled.
const ajv = new Ajv({ allErrors: true, coerceTypes: true })
addFormats(ajv)

/**
 * validateBody
 * Validates `req.body` against the provided schema.
 */
export const validateBody = (schema: object) => {
  const validate = ajv.compile(schema)

  return (req: Request, res: Response, next: NextFunction) => {
    if (!validate(req.body)) {
      res.status(400).json({
        error: 'ValidationError',
        message: formatApiErrors(validate.errors),
      })

      return
    }

    next()
  }
}

/**
 * validateQuery
 * Validates `req.query` against the provided schema.
 */
export const validateQuery = (schema: object) => {
  const validate = ajv.compile(schema)

  return (req: Request, res: Response, next: NextFunction) => {
    if (!validate(req.query)) {
      res.status(400).json({
        error: 'ValidationError',
        message: formatApiErrors(validate.errors),
      })

      return
    }

    next()
  }
}

/**
 * validateParams
 * Validates `req.params` against the provided schema.
 */
export const validateParams = (schema: object) => {
  const validate = ajv.compile(schema)

  return (req: Request, res: Response, next: NextFunction) => {
    if (!validate(req.params)) {
      res.status(400).json({
        error: 'ValidationError',
        message: formatApiErrors(validate.errors),
      })

      return
    }

    next()
  }
}
