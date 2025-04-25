import { Static, Type } from '@sinclair/typebox'

import { BookFieldSchema, BookSortFieldSchema } from './books.js'
import {
  createFieldsSelectionSchema,
  createPaginationSchema,
  createSortSchema,
} from './helper/helper.js'

/**
 * Catalog Search Query Schema
 */
export const CatalogSearchQuerySchema = Type.Object(
  {
    title: Type.Optional(Type.String({ minLength: 1 })),
    author: Type.Optional(Type.String({ minLength: 1 })),
    isbn: Type.Optional(Type.String({ minLength: 1 })),
    publicationYear: Type.Optional(Type.Number()),
    publisher: Type.Optional(Type.String({ minLength: 1 })),
    price: Type.Optional(Type.Number()),
    publicationYearMin: Type.Optional(Type.Number()),
    publicationYearMax: Type.Optional(Type.Number()),
    priceMin: Type.Optional(Type.Number()),
    priceMax: Type.Optional(Type.Number()),

    // Pagination and sort
    ...createPaginationSchema(),
    ...createSortSchema(BookSortFieldSchema),

    // GraphQL fields selection
    fields: createFieldsSelectionSchema(BookFieldSchema),
  },
  { additionalProperties: false },
)
export type CatalogSearchQuery = Static<typeof CatalogSearchQuerySchema>
export const CatalogSearchQueryRef = Type.Ref(
  '#/components/schemas/CatalogSearchQuery',
)
