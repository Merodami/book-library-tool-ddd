/**
 * Page Parameter for OpenAPI
 */
export const paramPaginationPage = {
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
export const paramPaginationLimit = {
  in: 'query',
  name: 'limit',
  description: 'Number of items per page (max 100)',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: Number(process.env.PAGINATION_MAX_LIMIT) || 100,
    default: Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10,
  },
}
