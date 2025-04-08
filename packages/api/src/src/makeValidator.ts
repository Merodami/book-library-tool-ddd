import type { TSchema } from '@sinclair/typebox'
import { Ajv } from 'ajv'
import _addFormats from 'ajv-formats'
import ajvErrorsImport from 'ajv-errors'
import { formatErrors } from '../util/formatErrors.js'

// Import the Ajv formats plugin fix (cannot import directly AddFormat)
const addFormats = _addFormats as unknown as typeof _addFormats.default

// Initialize AJV with all errors enabled.
const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
})
addFormats(ajv)

// Cast ajvErrorsImport as a callable function.
const ajvErrors = ajvErrorsImport as unknown as (ajv: Ajv) => void
ajvErrors(ajv)

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
      const errorArray = formatErrors(validate.errors)

      // You can throw the array directly or format it as a JSON string:
      throw new Error(JSON.stringify(errorArray, null, 2))
    }
    return data as T['static']
  }
}
