import { OpenAPIV3 } from 'openapi-types'

/**
 * Page Parameter for OpenAPI
 */
export const paramPaginationPage: OpenAPIV3.ParameterObject = {
  in: 'query',
  name: 'page',
  description: 'Page number (starting from 1)',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    default: 1,
  },
}

/**
 * Limit Parameter for OpenAPI
 */
export const paramPaginationLimit: OpenAPIV3.ParameterObject = {
  in: 'query',
  name: 'limit',
  description: 'Number of items per page (max 100)',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: parseInt(process.env.PAGINATION_MAX_LIMIT ?? '100', 10),
    default: parseInt(process.env.PAGINATION_DEFAULT_LIMIT ?? '10', 10),
  },
}

export const PaginationParameters = {
  page: paramPaginationPage,
  limit: paramPaginationLimit,
}
