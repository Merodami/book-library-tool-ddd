import { Static, Type } from '@sinclair/typebox'

// --------------------------------
// Query Schemas
// --------------------------------

export const ALLOWED_BOOK_FIELDS = [
  'id',
  'title',
  'author',
  'isbn',
  'publicationYear',
  'publisher',
  'price',
] as const

export type BookField = (typeof ALLOWED_BOOK_FIELDS)[number]

export const ALLOWED_BOOK_SORT_FIELDS = [
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

export type BookSortField = (typeof ALLOWED_BOOK_SORT_FIELDS)[number]

// --------------------------------
// Parameter Schemas
// --------------------------------

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
