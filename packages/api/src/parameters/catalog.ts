import { Type } from '@sinclair/typebox'
import { OpenAPIV3 } from 'openapi-types'

/**
 * Title Parameter for OpenAPI
 * Allows filtering books by their title. Supports partial matches and is case-insensitive.
 */
export const paramCatalogTitle: OpenAPIV3.ParameterObject = {
  name: 'title',
  in: 'query',
  description: 'Filter by title (case-insensitive, supports partial matches)',
  schema: Type.String({ minLength: 1 }),
  examples: {
    titleExample: {
      summary: 'Search by title',
      value: 'target',
    },
  },
}

/**
 * Author Parameter for OpenAPI
 * Enables filtering books by author name. Supports partial matches and is case-insensitive.
 */
export const paramCatalogAuthor: OpenAPIV3.ParameterObject = {
  name: 'author',
  in: 'query',
  description: 'Filter by author (case-insensitive, supports partial matches)',
  schema: Type.String({ minLength: 1 }),
  examples: {
    authorExample: {
      summary: 'Search by author',
      value: 'coulter',
    },
  },
}

/**
 * Publication Year Parameter for OpenAPI
 * Filters books by their exact publication year.
 */
export const paramCatalogPublicationYear: OpenAPIV3.ParameterObject = {
  name: 'publicationYear',
  in: 'query',
  description: 'Filter by exact publication year',
  schema: {
    type: 'number',
    format: 'int32',
    minimum: 0,
    maximum: new Date().getFullYear(),
  },
  examples: {
    yearExample: {
      summary: 'Filter books published in 2020',
      value: 2020,
    },
  },
}

/**
 * ISBN Parameter for OpenAPI
 * Filters books by their International Standard Book Number.
 */
export const paramCatalogISBN: OpenAPIV3.ParameterObject = {
  name: 'isbn',
  in: 'query',
  description: 'Filter by ISBN (exact match)',
  schema: Type.String({ minLength: 1 }),
  examples: {
    isbnExample: {
      summary: 'Search by ISBN',
      value: '0515125628',
    },
  },
}

/**
 * Publisher Parameter for OpenAPI
 * Filters books by their publisher. Supports partial matches and is case-insensitive.
 */
export const paramCatalogPublisher: OpenAPIV3.ParameterObject = {
  name: 'publisher',
  in: 'query',
  description:
    'Filter by publisher (case-insensitive, supports partial matches)',
  schema: Type.String({ minLength: 1 }),
  examples: {
    publisherExample: {
      summary: 'Search by publisher',
      value: 'jove',
    },
  },
}

/**
 * Price Parameter for OpenAPI
 * Filters books by their exact price.
 */
export const paramCatalogPrice: OpenAPIV3.ParameterObject = {
  name: 'price',
  in: 'query',
  description: 'Filter by exact price',
  schema: {
    type: 'number',
    format: 'float',
    minimum: 0,
  },
  examples: {
    priceExample: {
      summary: 'Search by exact price',
      value: 27,
    },
  },
}

/**
 * Publication Year Range Parameters for OpenAPI
 * Filters books within a range of publication years.
 */
export const paramCatalogPublicationYearMin: OpenAPIV3.ParameterObject = {
  name: 'publicationYearMin',
  in: 'query',
  description: 'Minimum publication year in range filter',
  schema: {
    type: 'number',
    format: 'int32',
    minimum: 0,
    maximum: new Date().getFullYear(),
  },
  examples: {
    yearMinExample: {
      summary: 'Search books published after year',
      value: 1990,
    },
  },
}

export const paramCatalogPublicationYearMax: OpenAPIV3.ParameterObject = {
  name: 'publicationYearMax',
  in: 'query',
  description: 'Maximum publication year in range filter',
  schema: {
    type: 'number',
    format: 'int32',
    minimum: 0,
    maximum: new Date().getFullYear(),
  },
  examples: {
    yearMaxExample: {
      summary: 'Search books published before year',
      value: 2000,
    },
  },
}

/**
 * Price Range Parameters for OpenAPI
 * Filters books within a price range.
 */
export const paramCatalogPriceMin: OpenAPIV3.ParameterObject = {
  name: 'priceMin',
  in: 'query',
  description: 'Minimum price in range filter',
  schema: {
    type: 'number',
    format: 'float',
    minimum: 0,
  },
  examples: {
    priceMinExample: {
      summary: 'Search books above minimum price',
      value: 20,
    },
  },
}

export const paramCatalogPriceMax: OpenAPIV3.ParameterObject = {
  name: 'priceMax',
  in: 'query',
  description: 'Maximum price in range filter',
  schema: {
    type: 'number',
    format: 'float',
    minimum: 0,
  },
  examples: {
    priceMaxExample: {
      summary: 'Search books below maximum price',
      value: 30,
    },
  },
}

/**
 * Sorting Parameters for OpenAPI
 * Controls the sorting of search results.
 */
export const paramCatalogSortBy: OpenAPIV3.ParameterObject = {
  name: 'sortBy',
  in: 'query',
  description:
    'Field to sort results by (title, author, publicationYear, price)',
  schema: Type.String(),
  examples: {
    sortByExample: {
      summary: 'Sort by field',
      value: 'publicationYear',
    },
  },
}

export const paramCatalogSortOrder: OpenAPIV3.ParameterObject = {
  name: 'sortOrder',
  in: 'query',
  description: 'Sort order direction (ASC for ascending, DESC for descending)',
  schema: {
    type: 'string',
    enum: ['ASC', 'DESC'],
  },
  examples: {
    sortOrderExample: {
      summary: 'Sort order',
      value: 'DESC',
    },
  },
}

/**
 * Field Selection Parameter for OpenAPI
 * Controls which fields are included in the response.
 */
export const paramCatalogFields: OpenAPIV3.ParameterObject = {
  name: 'fields',
  in: 'query',
  description:
    'Fields to include in the response (title, author, isbn, publicationYear, publisher, price)',
  schema: Type.Array(Type.String()),
  examples: {
    fieldsExample: {
      summary: 'Select specific fields',
      value: ['title', 'author', 'isbn'],
    },
  },
}
