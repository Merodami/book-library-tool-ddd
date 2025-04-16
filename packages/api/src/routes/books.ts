import { OpenAPIV3 } from 'openapi-types'

import { paramBookId } from '../parameters/book.js'
import {
  paramCatalogAuthor,
  paramCatalogFields,
  paramCatalogISBN,
  paramCatalogPrice,
  paramCatalogPriceMax,
  paramCatalogPriceMin,
  paramCatalogPublicationYear,
  paramCatalogPublicationYearMax,
  paramCatalogPublicationYearMin,
  paramCatalogPublisher,
  paramCatalogSortBy,
  paramCatalogSortOrder,
  paramCatalogTitle,
} from '../parameters/catalog.js'
import { registry } from '../schemaRegistry.js'

/**
 * Books API Specification
 */
export const BooksAPISpec: Partial<OpenAPIV3.Document> = {
  paths: {
    '/api/catalog': {
      get: {
        tags: ['Books'],
        operationId: 'searchCatalog',
        summary: 'Search for books in the catalog',
        description:
          'Allows searching for books with various filters, sorting, and field selection. Supports exact matches, partial matches, and range queries.',
        parameters: [
          paramCatalogTitle,
          paramCatalogAuthor,
          paramCatalogPublicationYear,
          paramCatalogISBN,
          paramCatalogPublisher,
          paramCatalogPrice,
          paramCatalogPublicationYearMin,
          paramCatalogPublicationYearMax,
          paramCatalogPriceMin,
          paramCatalogPriceMax,
          paramCatalogSortBy,
          paramCatalogSortOrder,
          paramCatalogFields,
        ],
        responses: {
          '200': {
            description:
              'A paginated list of books matching the search criteria',
            content: {
              'application/json': {
                schema: registry.ref('PaginatedBookResponse'),
                examples: {
                  paginatedBooks: {
                    summary:
                      'Example paginated book results with field selection',
                    value: {
                      data: [
                        {
                          title: 'The Target',
                          author: 'Catherine Coulter',
                          isbn: '0515125628',
                        },
                      ],
                      pagination: {
                        total: 25,
                        page: 1,
                        limit: 10,
                        pages: 3,
                        hasNext: true,
                        hasPrev: false,
                      },
                    },
                  },
                  fullResults: {
                    summary: 'Example with all fields',
                    value: {
                      data: [
                        {
                          isbn: '0515125628',
                          title: 'The Target',
                          author: 'Catherine Coulter',
                          publicationYear: 1999,
                          publisher: 'Jove Books',
                          price: 27,
                          createdAt: '2025-04-01T19:10:25.821Z',
                          updatedAt: '2025-04-01T19:10:25.821Z',
                        },
                      ],
                      pagination: {
                        total: 25,
                        page: 1,
                        limit: 10,
                        pages: 3,
                        hasNext: true,
                        hasPrev: false,
                      },
                    },
                  },
                  emptyResults: {
                    summary: 'No results found',
                    value: {
                      data: [],
                      pagination: {
                        total: 0,
                        page: 1,
                        limit: 10,
                        pages: 0,
                        hasNext: false,
                        hasPrev: false,
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: registry.ref('ErrorResponse'),
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '429': { $ref: '#/components/responses/RateLimitError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/api/books': {
      post: {
        tags: ['Books'],
        operationId: 'addBook',
        summary: 'Add a new book reference',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: registry.ref('BookCreateRequest'),
              examples: {
                theTarget: {
                  summary: 'The Target by Catherine Coulter',
                  value: {
                    id: '0515125628',
                    title: 'The Target',
                    author: 'Catherine Coulter',
                    publicationYear: 1999,
                    publisher: 'Jove Books',
                    price: 27,
                  },
                },
                evolutionMan: {
                  summary: 'The Evolution Man or How I Ate My Father',
                  value: {
                    id: '0679427279',
                    title: 'The Evolution Man or How I Ate My Father',
                    author: 'Roy Lewis',
                    publicationYear: 1993,
                    publisher: 'Random House Inc',
                    price: 19,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Book reference created',
            content: {
              'application/json': {
                schema: registry.ref('Book'),
                examples: {
                  theTarget: {
                    summary: 'The Target by Catherine Coulter',
                    value: {
                      id: '0515125628',
                      title: 'The Target',
                      author: 'Catherine Coulter',
                      publicationYear: 1999,
                      publisher: 'Jove Books',
                      price: 27,
                      createdAt: '2025-04-01T19:10:25.821Z',
                      updatedAt: '2025-04-01T19:10:25.821Z',
                    },
                  },
                  evolutionMan: {
                    summary: 'The Evolution Man or How I Ate My Father',
                    value: {
                      id: '0679427279',
                      title: 'The Evolution Man or How I Ate My Father',
                      author: 'Roy Lewis',
                      publicationYear: 1993,
                      publisher: 'Random House Inc',
                      price: 19,
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequestError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '409': { $ref: '#/components/responses/ConflictError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
    '/api/books/{isbn}': {
      get: {
        tags: ['Books'],
        operationId: 'getBookById',
        summary: 'Get book by reference id',
        parameters: [paramBookId],
        responses: {
          '200': {
            description: 'Book found',
            content: {
              'application/json': {
                schema: registry.ref('Book'),
                examples: {
                  bookFound: {
                    summary: 'Book found successfully',
                    value: {
                      id: '0515125628',
                      title: 'The Target',
                      author: 'Catherine Coulter',
                      publicationYear: 1999,
                      publisher: 'Jove Books',
                      price: 27,
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
      patch: {
        tags: ['Books'],
        operationId: 'updateBook',
        summary: 'Update a book reference',
        parameters: [paramBookId],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: registry.ref('BookUpdateRequest'),
              examples: {
                updatePrice: {
                  summary: 'Update book price',
                  value: {
                    price: 29.99,
                  },
                },
                updatePublisher: {
                  summary: 'Update book publisher',
                  value: {
                    publisher: 'New Publisher Inc',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Book updated successfully',
            content: {
              'application/json': {
                schema: registry.ref('Book'),
                examples: {
                  updatedBook: {
                    summary: 'Book updated successfully',
                    value: {
                      id: '0515125628',
                      title: 'The Target',
                      author: 'Catherine Coulter',
                      publicationYear: 1999,
                      publisher: 'New Publisher Inc',
                      price: 29.99,
                      createdAt: '2025-04-01T19:10:25.821Z',
                      updatedAt: '2025-04-02T10:15:30.456Z',
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequestError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
      delete: {
        tags: ['Books'],
        operationId: 'deleteBook',
        summary: 'Delete a book reference',
        parameters: [paramBookId],
        responses: {
          '204': {
            description: 'Book deleted successfully',
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
        security: [{ ApiTokenAuth: [] }],
      },
    },
  },
  components: {
    parameters: {
      paramCatalogTitle,
      paramCatalogAuthor,
      paramCatalogPublicationYear,
      paramCatalogISBN,
      paramCatalogPublisher,
      paramCatalogPrice,
      paramCatalogPublicationYearMin,
      paramCatalogPublicationYearMax,
      paramCatalogPriceMin,
      paramCatalogPriceMax,
      paramCatalogSortBy,
      paramCatalogSortOrder,
      paramCatalogFields,
    },
  },
}
