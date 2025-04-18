import { ErrorCode, Errors } from '@book-library-tool/shared'
import { TSchema } from '@sinclair/typebox'
import { Ajv } from 'ajv'
import ajvErrorsImport from 'ajv-errors'
import _addFormats from 'ajv-formats'
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
} from 'fastify'

import { formatApiErrors } from './formatApiError.js'
import { formatErrors } from './formatErrors.js'

// Import the Ajv formats plugin fix (cannot import directly AddFormat)
const addFormats = _addFormats as unknown as typeof _addFormats.default

// Initialize AJV with all errors enabled.
const ajv = new Ajv({
  allErrors: true,
  coerceTypes: false,
})

const ajvErrors = ajvErrorsImport as unknown as (localAjv: Ajv) => void

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
 * Sets up custom validation error handling for Fastify
 * @param fastify - The Fastify instance
 */
export function setupValidation(fastify: FastifyInstance): void {
  // Set custom error handler for validation errors
  fastify.setValidatorCompiler(({ schema }) => {
    return (data) => {
      const validate = ajv.compile(schema)
      const valid = validate(data)

      if (!valid) {
        return {
          error: new Errors.ApplicationError(
            400,
            ErrorCode.VALIDATION_ERROR,
            formatApiErrors(validate.errors),
          ),
        }
      }

      return { value: data }
    }
  })

  // Set custom error handler for query parameter validation
  fastify.setSchemaErrorFormatter((errors, dataVar) => {
    if (dataVar === 'querystring') {
      return new Errors.ApplicationError(
        400,
        ErrorCode.VALIDATION_ERROR,
        formatApiErrors(errors),
      )
    }

    return new Errors.ApplicationError(
      400,
      ErrorCode.VALIDATION_ERROR,
      formatApiErrors(errors),
    )
  })
}

/**
 * Helper function to create route schema for Fastify
 * @param bodySchema - Schema for request body
 * @param querySchema - Schema for query parameters
 * @param paramsSchema - Schema for URL parameters
 * @returns A Fastify schema object
 */
export function createRouteSchema(
  bodySchema?: object,
  querySchema?: object,
  paramsSchema?: object,
): FastifySchema {
  const schema: FastifySchema = {}

  if (bodySchema) {
    schema.body = bodySchema
  }

  if (querySchema) {
    schema.querystring = querySchema
  }

  if (paramsSchema) {
    schema.params = paramsSchema
  }

  return schema
}

/**
 * Middleware to validate request body
 * Note: In Fastify, it's preferred to use the built-in schema validation,
 * but this is provided for backward compatibility
 */
export function validateBody(schema: object) {
  const validate = ajv.compile(schema)

  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ) => {
    if (!validate(request.body)) {
      return reply.code(400).send({
        statusCode: 400,
        error: ErrorCode.VALIDATION_ERROR,
        message: formatApiErrors(validate.errors),
      })
    }

    done()
  }
}

/**
 * Middleware to validate query parameters
 * Note: In Fastify, it's preferred to use the built-in schema validation,
 * but this is provided for backward compatibility
 */
export function validateQuery(schema: object) {
  const validate = queryAjv.compile(schema)

  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ) => {
    if (!validate(request.query)) {
      return reply.code(400).send({
        statusCode: 400,
        error: ErrorCode.VALIDATION_ERROR,
        message: formatApiErrors(validate.errors),
      })
    }

    done()
  }
}

/**
 * Middleware to validate URL parameters
 * Note: In Fastify, it's preferred to use the built-in schema validation,
 * but this is provided for backward compatibility
 */
export function validateParams(schema: object) {
  const validate = ajv.compile(schema)

  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ) => {
    if (!validate(request.params)) {
      return reply.code(400).send({
        statusCode: 400,
        error: ErrorCode.VALIDATION_ERROR,
        message: formatApiErrors(validate.errors),
      })
    }

    done()
  }
}

/**
 * Type-safe validator function for TypeBox schema
 * @param schema - The TypeBox schema to validate against
 * @returns A function that validates data against the schema
 */
export function makeValidator<T extends TSchema>(schema: T) {
  return (data: unknown): T['static'] => {
    const validate = ajv.compile(schema)
    const valid = validate(data)

    if (!valid && validate.errors) {
      throw new Errors.ApplicationError(
        400,
        ErrorCode.VALIDATION_ERROR,
        formatErrors(validate.errors),
      )
    }

    return data as T['static']
  }
}
