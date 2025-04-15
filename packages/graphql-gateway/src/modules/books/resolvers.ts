import type {
  Book,
  BookCreateRequest,
  BookUpdateRequest,
} from '@book-library-tool/sdk'
import type { GraphQLResolveInfo } from 'graphql'
import { GraphQLError } from 'graphql'

import { Cache } from '../../decorators/cache.js'
import type { GraphQLContext } from '../../types/context.js'

/**
 * Filter options for books query
 */
interface BookFilter {
  title?: string
  author?: string
  isbn?: string
  publicationYear?: number
  publisher?: string
  price?: number
  available?: boolean
  publicationYearRange?: {
    min?: number
    max?: number
  }
  priceRange?: {
    min?: number
    max?: number
  }
}

interface PaginationInput {
  page: number
  limit: number
}

interface SortInput {
  field: string
  order: 'ASC' | 'DESC'
}

/**
 * Gets the requested fields from the GraphQL query
 */
function getRequestedFields(info: GraphQLResolveInfo): string[] {
  const fields: string[] = []
  const selectionSet = info.fieldNodes[0].selectionSet
  if (!selectionSet) return fields

  selectionSet.selections.forEach(
    (selection: { kind: string; name?: { value: string } }) => {
      if (selection.kind === 'Field' && selection.name) {
        fields.push(selection.name.value)
      }
    },
  )

  return fields
}

interface BooksQueryResult {
  books: Book[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

class BooksResolver {
  @Cache(60)
  async books(
    _: unknown,
    {
      filter,
      pagination,
      sort,
    }: {
      filter?: BookFilter
      pagination?: PaginationInput
      sort?: SortInput
    },
    context: GraphQLContext,
    info: GraphQLResolveInfo,
  ): Promise<BooksQueryResult> {
    try {
      if (!context?.booksService) {
        throw new GraphQLError('Books service not available', {
          extensions: {
            code: 'SERVICE_UNAVAILABLE',
          },
        })
      }

      const { page = 1, limit = 10 } = pagination || {}
      const skip = (page - 1) * limit

      // Get requested fields from the query
      const requestedFields = getRequestedFields(info)

      // Validate sort field if provided
      if (sort) {
        const validSortFields = [
          'title',
          'author',
          'isbn',
          'publicationYear',
          'publisher',
          'price',
        ]
        if (!validSortFields.includes(sort.field)) {
          throw new GraphQLError('Invalid sort field', {
            extensions: {
              code: 'INVALID_SORT_FIELD',
              validFields: validSortFields,
            },
          })
        }
      }

      // Get filtered, paginated, and sorted books with field selection
      const { books, total } = await context.booksService.getBooks({
        filter,
        skip,
        limit,
        sort,
        fields: requestedFields,
      })

      return {
        books,
        total,
        page,
        limit,
        hasMore: skip + books.length < total,
      }
    } catch (error) {
      console.error('Error in books resolver:', error)
      if (error instanceof GraphQLError) {
        throw error
      }
      throw new GraphQLError('Failed to fetch books', {
        extensions: {
          code: 'BOOKS_FETCH_ERROR',
          originalError: error,
        },
      })
    }
  }

  @Cache(300)
  async book(
    _: unknown,
    { isbn }: { isbn: string },
    { bookLoader }: GraphQLContext,
    info: GraphQLResolveInfo,
  ): Promise<Book | null> {
    try {
      if (!bookLoader) {
        throw new GraphQLError('Book loader not available', {
          extensions: {
            code: 'SERVICE_UNAVAILABLE',
          },
        })
      }

      // Get requested fields from the query
      const requestedFields = getRequestedFields(info)

      // Use the loader to get the book
      const book = await bookLoader.load(isbn)

      // If no book found, return null
      if (!book) {
        return null
      }

      // Filter fields based on the query
      if (requestedFields.length > 0) {
        return Object.fromEntries(
          Object.entries(book).filter(([key]) => requestedFields.includes(key)),
        ) as Book
      }

      return book
    } catch (error) {
      console.error('Error in book resolver:', error)
      if (error instanceof GraphQLError) {
        throw error
      }
      throw new GraphQLError('Failed to fetch book', {
        extensions: {
          code: 'BOOK_FETCH_ERROR',
          originalError: error,
        },
      })
    }
  }

  async createBook(
    _: unknown,
    { input }: { input: BookCreateRequest },
    { booksService, redisService }: GraphQLContext,
  ): Promise<Book> {
    try {
      if (!booksService) {
        throw new GraphQLError('Books service not available', {
          extensions: {
            code: 'SERVICE_UNAVAILABLE',
          },
        })
      }

      const book = await booksService.createBook(input)

      // Invalidate books cache
      await redisService.delPattern('books:*')

      return book
    } catch (error) {
      console.error('Error in createBook resolver:', error)
      if (error instanceof GraphQLError) {
        throw error
      }
      throw new GraphQLError('Failed to create book', {
        extensions: {
          code: 'BOOK_CREATE_ERROR',
          originalError: error,
        },
      })
    }
  }

  async updateBook(
    _: unknown,
    { isbn, input }: { isbn: string; input: BookUpdateRequest },
    { booksService, redisService }: GraphQLContext,
  ): Promise<Book> {
    try {
      if (!booksService) {
        throw new GraphQLError('Books service not available', {
          extensions: {
            code: 'SERVICE_UNAVAILABLE',
          },
        })
      }

      const book = await booksService.updateBook(isbn, input)

      // Invalidate caches
      await redisService.del(`book:${isbn}`)
      await redisService.delPattern('books:*')

      return book
    } catch (error) {
      console.error('Error in updateBook resolver:', error)
      if (error instanceof GraphQLError) {
        throw error
      }
      throw new GraphQLError('Failed to update book', {
        extensions: {
          code: 'BOOK_UPDATE_ERROR',
          originalError: error,
        },
      })
    }
  }

  async deleteBook(
    _: unknown,
    { isbn }: { isbn: string },
    { booksService, redisService }: GraphQLContext,
  ): Promise<boolean> {
    try {
      if (!booksService) {
        throw new GraphQLError('Books service not available', {
          extensions: {
            code: 'SERVICE_UNAVAILABLE',
          },
        })
      }

      await booksService.deleteBook(isbn)

      // Invalidate caches
      await redisService.del(`book:${isbn}`)
      await redisService.delPattern('books:*')

      return true
    } catch (error) {
      console.error('Error in deleteBook resolver:', error)
      if (error instanceof GraphQLError) {
        throw error
      }
      throw new GraphQLError('Failed to delete book', {
        extensions: {
          code: 'BOOK_DELETE_ERROR',
          originalError: error,
        },
      })
    }
  }
}

export const createResolvers = () => {
  const resolver = new BooksResolver()

  return {
    Query: {
      books: resolver.books.bind(resolver),
      book: resolver.book.bind(resolver),
    },
    Mutation: {
      createBook: resolver.createBook.bind(resolver),
      updateBook: resolver.updateBook.bind(resolver),
      deleteBook: resolver.deleteBook.bind(resolver),
    },
  }
}
