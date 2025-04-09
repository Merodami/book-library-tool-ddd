import { Type, Static } from '@sinclair/typebox'
import { PaginationMetadataSchema } from './shared.js'

// --------------------------------
// Query Schemas
// --------------------------------

/**
 * Catalog Search Query Schema (Used for the request validation)
 */
export const CatalogSearchQuerySchema = Type.Partial(
  Type.Object({
    title: Type.String({ minLength: 1 }),
    author: Type.String({ minLength: 1 }),
    publicationYear: Type.Number(),
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Number({
        minimum: 1,
        maximum: Number(process.env.PAGINATION_MAX_LIMIT) || 100,
        default: Number(process.env.PAGINATION_DEFAULT_LIMIT) || 10,
      }),
    ),
  }),
  { $id: '#/components/schemas/CatalogSearchQuery' },
)
export type CatalogSearchQuery = Static<typeof CatalogSearchQuerySchema>
export const CatalogSearchQueryRef = Type.Ref(
  '#/components/schemas/CatalogSearchQuery',
)

// --------------------------------
// Request Schemas
// --------------------------------

/**
 * Book Reference ID Schema
 */
export const BookIdSchema = Type.Object(
  {
    isbn: Type.String({ minLength: 1 }),
  },
  { $id: '#/components/schemas/BookId' },
)
export type BookId = Static<typeof BookIdSchema>
export const BookIdRef = Type.Ref('#/components/schemas/BookId')

/**
 * Add Book Reference Request Schema
 */
export const BookCreateRequestSchema = Type.Object(
  {
    isbn: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    title: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    author: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    publicationYear: Type.Number(),
    publisher: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    price: Type.Number(),
  },
  { $id: '#/components/schemas/BookCreateRequest' },
)
export type BookCreateRequest = Static<typeof BookCreateRequestSchema>
export const BookCreateRequestRef = Type.Ref(
  '#/components/schemas/BookCreateRequest',
)

/**
 * Update Book Reference Request Schema
 */
export const BookUpdateRequestSchema = Type.Object(
  {
    isbn: Type.Optional(Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' })),
    title: Type.Optional(
      Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    ),
    author: Type.Optional(
      Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    ),
    publicationYear: Type.Optional(Type.Number()),
    publisher: Type.Optional(
      Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    ),
    price: Type.Optional(Type.Number()),
  },
  { $id: '#/components/schemas/BookUpdateRequest' },
)
export type BookUpdateRequest = Static<typeof BookUpdateRequestSchema>
export const BookUpdateRequestRef = Type.Ref(
  '#/components/schemas/BookUpdateRequest',
)

// --------------------------------
// Response Schemas
// --------------------------------

/**
 * Book Schema
 */
export const BookSchema = Type.Object(
  {
    isbn: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    title: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    author: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    publicationYear: Type.Number({ minimum: 0 }),
    publisher: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    price: Type.Number({ minimum: 0 }),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' })),
    deletedAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
  { $id: '#/components/schemas/Book' },
)
export type BookDTO = Static<typeof BookSchema>
export const BookRef = Type.Ref('#/components/schemas/Book')

// --------------------------------
// Paginated Response Schemas
// --------------------------------

/**
 * Paginated Book Response Schema
 */
export const PaginatedBookResponseSchema = Type.Object(
  {
    data: Type.Array(BookRef),
    pagination: PaginationMetadataSchema,
  },
  { $id: '#/components/schemas/PaginatedBookResponse' },
)
export type PaginatedBookResponse = Static<typeof PaginatedBookResponseSchema>
export const PaginatedBookResponseRef = Type.Ref(
  '#/components/schemas/PaginatedBookResponse',
)
