import { Type } from '@sinclair/typebox'

/**
 * Title Parameter for OpenAPI
 * Allows filtering books by their title. Supports partial matches and is case-insensitive.
 */
export const paramCatalogTitle = {
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
export const paramCatalogAuthor = {
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
export const paramCatalogPublicationYear = {
  name: 'publicationYear',
  in: 'query',
  description: 'Filter by exact publication year',
  schema: Type.Number(),
  examples: {
    yearExample: {
      summary: 'Search by publication year',
      value: 1999,
    },
  },
}

/**
 * ISBN Parameter for OpenAPI
 * Filters books by their International Standard Book Number.
 */
export const paramCatalogISBN = {
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
export const paramCatalogPublisher = {
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
export const paramCatalogPrice = {
  name: 'price',
  in: 'query',
  description: 'Filter by exact price',
  schema: Type.Number(),
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
export const paramCatalogPublicationYearMin = {
  name: 'publicationYearMin',
  in: 'query',
  description: 'Minimum publication year in range filter',
  schema: Type.Number(),
  examples: {
    yearMinExample: {
      summary: 'Search books published after year',
      value: 1990,
    },
  },
}

export const paramCatalogPublicationYearMax = {
  name: 'publicationYearMax',
  in: 'query',
  description: 'Maximum publication year in range filter',
  schema: Type.Number(),
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
export const paramCatalogPriceMin = {
  name: 'priceMin',
  in: 'query',
  description: 'Minimum price in range filter',
  schema: Type.Number(),
  examples: {
    priceMinExample: {
      summary: 'Search books above minimum price',
      value: 20,
    },
  },
}

export const paramCatalogPriceMax = {
  name: 'priceMax',
  in: 'query',
  description: 'Maximum price in range filter',
  schema: Type.Number(),
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
export const paramCatalogSortBy = {
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

export const paramCatalogSortOrder = {
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
export const paramCatalogFields = {
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
