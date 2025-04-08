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
export const BookRequestSchema = Type.Object(
  {
    isbn: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    title: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    author: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    publicationYear: Type.Number(),
    publisher: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    price: Type.Number(),
  },
  { $id: '#/components/schemas/BookRequest' },
)
export type BookRequest = Static<typeof BookRequestSchema>
export const BookRequestRef = Type.Ref('#/components/schemas/BookRequest')

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
