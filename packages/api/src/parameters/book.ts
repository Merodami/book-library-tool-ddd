import { OpenAPIV3 } from 'openapi-types'

// --------------------------------
// OpenAPI Parameters
// --------------------------------

/**
 * Book Parameter for OpenAPI
 */
export const paramBookId: OpenAPIV3.ParameterObject = {
  in: 'path',
  name: 'isbn',
  description: 'The book ISBN',
  required: true,
  schema: {
    type: 'string',
    format: 'isbn',
  },
  examples: {
    bookId1: {
      summary: 'Book reference id example',
      value: '0515125628',
    },
  },
}
