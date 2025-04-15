import { Static, Type } from '@sinclair/typebox'

// --------------------------------
// Query Schemas
// --------------------------------

const ALLOWED_FIELDS = [
  'id',
  'title',
  'author',
  'isbn',
  'publicationYear',
  'publisher',
  'price',
] as const

const ALLOWED_SORT_FIELDS = [
  'id',
  'title',
  'author',
  'isbn',
  'publicationYear',
  'publisher',
  'price',
  'createdAt',
  'updatedAt',
] as const

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
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    skip: Type.Optional(Type.Number({ minimum: 0 })),
    limit: Type.Optional(
      Type.Number({
        minimum: 1,
        maximum: parseInt(process.env.PAGINATION_MAX_LIMIT ?? '100', 10),
        default: 10,
      }),
    ),
    sortBy: Type.Optional(
      Type.Union(ALLOWED_SORT_FIELDS.map((field) => Type.Literal(field))),
    ),
    sortOrder: Type.Optional(
      Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
    ),
    fields: Type.Optional(
      Type.Array(
        Type.Union(ALLOWED_FIELDS.map((field) => Type.Literal(field))),
        { minItems: 1 },
      ),
    ),
  },
  { additionalProperties: false },
)
export type CatalogSearchQuery = Static<typeof CatalogSearchQuerySchema>
export const CatalogSearchQueryRef = Type.Ref(
  '#/components/schemas/CatalogSearchQuery',
)
