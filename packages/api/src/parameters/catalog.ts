/**
 * Title Parameter for OpenAPI
 */
export const paramCatalogTitle = {
  in: 'query',
  name: 'title',
  description: 'Partial or full title (case-insensitive)',
  required: false,
  schema: { type: 'string' },
  examples: {
    titleExample: {
      summary: 'Search by title',
      value: 'target',
    },
  },
}

/**
 * Author Parameter for OpenAPI
 */
export const paramCatalogAuthor = {
  in: 'query',
  name: 'author',
  description: 'Partial or full author name (case-insensitive)',
  required: false,
  schema: { type: 'string' },
  examples: {
    authorExample: {
      summary: 'Search by author',
      value: 'coulter',
    },
  },
}

/**
 * Publication Year Parameter for OpenAPI
 */
export const paramCatalogPublicationYear = {
  in: 'query',
  name: 'publicationYear',
  description: 'Exact publication year',
  required: false,
  schema: { type: 'integer' },
  examples: {
    yearExample: {
      summary: 'Search by publication year',
      value: 1999,
    },
  },
}
