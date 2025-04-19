import { Static, Type } from '@sinclair/typebox'

import { PaginationMetadataSchema } from './pagination.js'

// --------------------------------
// Parameter Schemas
// --------------------------------

/**
 * Book Parameter Schema
 */
export const BookIdParameterSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
  },
  {
    $id: '#/components/parameters/BookIdParameter',
    description: 'The book ID',
  },
)
export type BookIdParameter = Static<typeof BookIdParameterSchema>
export const BookIdParameterRef = Type.Ref(
  '#/components/parameters/BookIdParameter',
)

// --------------------------------
// Request Schemas
// --------------------------------

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
    id: Type.Optional(Type.String({ minLength: 1 })),
    isbn: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    title: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    author: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    publicationYear: Type.Number({ minimum: 0 }),
    publisher: Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    price: Type.Number({ minimum: 0 }),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(
      Type.String({ format: 'date-time', nullable: true }),
    ),
    deletedAt: Type.Optional(
      Type.String({ format: 'date-time', nullable: true }),
    ),
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
