import { TSchema } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import { NextFunction, Request, Response } from 'express'

/**
 * Helper function to convert string query parameters to their numeric values
 */
function parseQueryParams(
  query: Record<string, any>,
  schema: TSchema,
): Record<string, any> {
  // Create an empty result object
  const result: Record<string, any> = {}

  // Return empty result if query or schema is not provided
  if (!query || !schema) {
    return result
  }

  try {
    // Get the schema properties from the trusted schema object.
    // We assume that `schema` has a property "properties" that lists allowed keys.
    const schemaProps = (schema as any)?.properties
    if (!schemaProps || typeof schemaProps !== 'object') return result

    // DIRTY FIX: Disable ESLint for the problematic lines

    for (const [key, definition] of Object.entries(schemaProps)) {
      // Only process if the query contains this trusted key
      if (!Object.prototype.hasOwnProperty.call(query, key)) {
        continue
      }

      // eslint-disable-next-line security/detect-object-injection
      const value = query[key]
      const propType = (definition as any)?.type

      // Convert string values to numbers if the schema expects a number.
      if (propType === 'number' && typeof value === 'string') {
        const parsed = Number(value)
        // eslint-disable-next-line security/detect-object-injection
        result[key] = !isNaN(parsed) ? parsed : value
      } else {
        // eslint-disable-next-line security/detect-object-injection
        result[key] = value
      }
    }
  } catch (error) {
    console.error('Error parsing query parameters:', error)
  }

  return result
}

/**
 * Middleware to validate query parameters against a TypeBox schema.
 */
export const validateQuery = (schema: TSchema) => {
  // Compile the schema for better performance
  const check = TypeCompiler.Compile(schema)

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse query params to convert strings to appropriate types
      const parsedQuery = parseQueryParams(req.query, schema)

      // Validate against the TypeBox schema
      if (check.Check(parsedQuery)) {
        req.query = parsedQuery
        next()
      } else {
        const errors = [...check.Errors(parsedQuery)]
        res.status(400).json({
          error: 'ValidationError',
          message: errors.map((error) => error.message),
        })
      }
    } catch (error) {
      res.status(400).json({
        error: 'ValidationError',
        message: [(error as Error).message],
      })
    }
  }
}
