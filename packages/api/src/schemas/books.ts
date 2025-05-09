import { BookFieldEnum, BookSortFieldEnum } from '@book-library-tool/sdk'
import { Static, Type } from '@sinclair/typebox'

// --------------------------------
// Query Schemas
// --------------------------------

export const BookFieldSchema = Type.Enum(BookFieldEnum, {
  $id: '#/components/schemas/BookField',
})

export type BookField = Static<typeof BookFieldSchema>

export const BookSortFieldSchema = Type.Enum(BookSortFieldEnum, {
  $id: '#/components/schemas/BookSortField',
})

export type BookSortField = Static<typeof BookSortFieldSchema>

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
    id: Type.Optional(
      Type.String({
        format: 'uuid',
        minLength: 1,
        pattern: '^(?!\\s*$).+',
      }),
    ),
    isbn: Type.Optional(Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' })),
    title: Type.Optional(
      Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    ),
    author: Type.Optional(
      Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    ),
    publicationYear: Type.Optional(Type.Number({ minimum: 0 })),
    publisher: Type.Optional(
      Type.String({ minLength: 1, pattern: '^(?!\\s*$).+' }),
    ),
    price: Type.Optional(Type.Number({ minimum: 0 })),
    version: Type.Optional(Type.Number({ minimum: 0 })),
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
export type Book = Static<typeof BookSchema>
export const BookRef = Type.Ref('#/components/schemas/Book')
