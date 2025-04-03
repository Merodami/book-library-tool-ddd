import { Request, Response, NextFunction } from 'express'
import { TSchema } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'

/**
 * Helper function to convert string query parameters to their numeric values
 */
function parseQueryParams(
  query: Record<string, any>,
  schema: TSchema,
): Record<string, any> {
  const result: Record<string, any> = {}

  // Get schema properties
  const properties = (schema as any).properties || {}

  for (const [key, value] of Object.entries(query)) {
    if (
      properties[key] &&
      properties[key].type === 'number' &&
      typeof value === 'string'
    ) {
      const parsed = Number(value)
      if (!isNaN(parsed)) {
        result[key] = parsed
      } else {
        result[key] = value // Keep as string if parsing fails
      }
    } else {
      result[key] = value
    }
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
