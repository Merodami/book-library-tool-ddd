import { OpenAPIV3 } from 'openapi-types'

// --------------------------------
// OpenAPI Parameters
// --------------------------------

/**
 * User Parameter for OpenAPI
 */
export const paramUserId: OpenAPIV3.ParameterObject = {
  in: 'path',
  name: 'userId',
  description: 'User identifier (UUID)',
  required: true,
  schema: {
    type: 'string',
    format: 'uuid',
  },
  examples: {
    userId1: {
      summary: 'Example user ID',
      value: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    },
  },
}
