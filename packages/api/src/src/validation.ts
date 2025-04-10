import { Errors } from '@book-library-tool/shared'
import { TSchema } from '@sinclair/typebox'
import { Ajv } from 'ajv'
import ajvErrorsImport from 'ajv-errors'
import _addFormats from 'ajv-formats'
import { NextFunction, Request, Response } from 'express'

import { formatApiErrors } from '../util/formatApiError.js'
import { formatErrors } from '../util/formatErrors.js'

// Import the Ajv formats plugin fix (cannot import directly AddFormat)
const addFormats = _addFormats as unknown as typeof _addFormats.default

// Initialize AJV with all errors enabled.
const ajv = new Ajv({
  allErrors: true,
  coerceTypes: false,
})

const ajvErrors = ajvErrorsImport as unknown as (ajv: Ajv) => void

addFormats(ajv)
ajvErrors(ajv)

// Create a separate instance for query parameter validation
const queryAjv = new Ajv({
  allErrors: true,
  coerceTypes: true, // Enable type coercion for query params
})
addFormats(queryAjv)
ajvErrors(queryAjv)

/**
 * validateBody
 * Validates `req.body` against the provided schema.
 */
export const validateBody = (schema: object) => {
  const validate = ajv.compile(schema)

  return (req: Request, res: Response, next: NextFunction) => {
    if (!validate(req.body)) {
      throw new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        formatApiErrors(validate.errors),
      )
    }

    next()
  }
}

/**
 * validateQuery
 * Validates `req.query` against the provided schema.
 */
export const validateQuery = (schema: object) => {
  const validate = queryAjv.compile(schema)

  return (req: Request, res: Response, next: NextFunction) => {
    if (!validate(req.query)) {
      throw new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        formatApiErrors(validate.errors),
      )
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
      throw new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        formatApiErrors(validate.errors),
      )
    }

    next()
  }
}

/**
 * makeValidator is a utility function that compiles a TypeBox schema into a
 * type-safe validator function. This function validates data against the provided schema
 * and throws an error with simplified messages if validation fails.
 *
 * @param schema - The TypeBox schema to compile and validate against.
 * @returns A function that takes a value and returns the validated value or throws an error.
 */
export function makeValidator<T extends TSchema>(schema: T) {
  return (data: unknown): T['static'] => {
    const validate = ajv.compile(schema)
    const valid = validate(data)

    if (!valid && validate.errors) {
      // You can throw the array directly or format it as a JSON string
      throw new Errors.ApplicationError(
        400,
        'VALIDATION_ERROR',
        formatErrors(validate.errors),
      )
    }

    return data as T['static']
  }
}
